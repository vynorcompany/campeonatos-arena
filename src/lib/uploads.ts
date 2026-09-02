import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxUploadSize = 4 * 1024 * 1024;
const maxArenaLogoUploadSize = 500 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"]
]);

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

export async function savePublicImageUpload(file: File | null, folder: string, prefix: string) {
  if (!file || file.size === 0) {
    return null;
  }

  const extension = allowedImageTypes.get(file.type);

  if (!extension) {
    throw new Error("Envie uma imagem JPG, PNG, WEBP ou SVG.");
  }

  if (file.size > maxUploadSize) {
    throw new Error("A imagem deve ter no máximo 4 MB.");
  }

  const safeFolder = sanitizeName(folder) || "uploads";
  const safePrefix = sanitizeName(prefix) || "imagem";
  const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
  const fileName = `${safePrefix}-${Date.now()}.${extension}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));

  return `/uploads/${safeFolder}/${fileName}`;
}
