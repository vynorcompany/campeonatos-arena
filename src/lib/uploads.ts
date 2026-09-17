import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const maxUploadSize = 4 * 1024 * 1024;
const maxPortalEventUploadSize = 25 * 1024 * 1024;
const maxArenaLogoUploadSize = 500 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"]
]);

type R2Configuration = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

let r2Client: S3Client | null = null;

function getR2Configuration(): R2Configuration | null {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  const values = [endpoint, bucket, accessKeyId, secretAccessKey, publicBaseUrl];
  if (values.every((value) => !value)) return null;
  if (values.some((value) => !value)) throw new Error("A configuração do Cloudflare R2 está incompleta.");

  return {
    endpoint: endpoint!,
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    publicBaseUrl: publicBaseUrl!.replace(/\/$/, "")
  };
}

function getR2Client(config: R2Configuration) {
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
  return r2Client;
}

export async function toPersistentArenaLogo(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) {
    return null;
  }

  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG, WEBP ou SVG.");
  }

  if (file.size > maxArenaLogoUploadSize) {
    throw new Error("A imagem deve ter no máximo 500 KB.");
  }

  return `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
}

export async function toPersistentPlayerPhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!allowedImageTypes.has(file.type) || file.type === "image/svg+xml") throw new Error("Envie uma foto JPG, PNG ou WEBP.");
  if (file.size > maxUploadSize) throw new Error("A foto deve ter no máximo 4 MB.");

  return `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
}

function sanitizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function getPersistentUploadDirectory() {
  const volumeMountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (volumeMountPath) return volumeMountPath;
  return path.join(process.cwd(), "public", "uploads");
}

async function storePublicImage(
  content: Buffer,
  { folder, prefix, extension, contentType, arenaId }: { folder: string; prefix: string; extension: string; contentType: string; arenaId?: string }
) {
  const safeFolder = sanitizeName(folder) || "uploads";
  const safePrefix = sanitizeName(prefix) || "imagem";
  const fileName = `${safePrefix}-${Date.now()}.${extension}`;
  const r2 = getR2Configuration();

  if (r2) {
    const safeArenaId = sanitizeName(arenaId ?? "");
    if (!safeArenaId) throw new Error("Não foi possível identificar a arena do upload.");
    const key = `arenas/${safeArenaId}/${safeFolder}/${fileName}`;
    await getR2Client(r2).send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable"
      })
    );
    return `${r2.publicBaseUrl}/${key}`;
  }

  if (process.env.NODE_ENV === "production" && !process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim()) {
    throw new Error("Configure um Volume da Railway ou o Cloudflare R2 antes de enviar imagens em produção.");
  }

  const uploadDir = path.join(getPersistentUploadDirectory(), safeFolder);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), content);

  return `/media/uploads/${safeFolder}/${fileName}`;
}

export async function savePublicImageUpload(file: File | null, folder: string, prefix: string, arenaId?: string) {
  if (!file || file.size === 0) return null;

  const extension = allowedImageTypes.get(file.type);
  if (!extension) throw new Error("Envie uma imagem JPG, PNG, WEBP ou SVG.");
  if (file.size > maxUploadSize) throw new Error("A imagem deve ter no máximo 4 MB.");

  return storePublicImage(Buffer.from(await file.arrayBuffer()), {
    folder,
    prefix,
    extension,
    contentType: file.type,
    arenaId
  });
}

export async function saveOptimizedPortalEventImageUpload(file: File | null, arenaId: string, prefix = "event") {
  if (!file || file.size === 0) return null;
  if (!allowedImageTypes.has(file.type) || file.type === "image/svg+xml") {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }
  if (file.size > maxPortalEventUploadSize) throw new Error("A imagem original deve ter no máximo 25 MB.");

  const optimizedImage = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 1080, height: 1920, fit: "cover" })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return storePublicImage(optimizedImage, {
    folder: "portal-events",
    prefix,
    extension: "webp",
    contentType: "image/webp",
    arenaId
  });
}
