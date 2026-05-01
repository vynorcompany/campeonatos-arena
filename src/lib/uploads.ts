import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxUploadSize = 4 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

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
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
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
