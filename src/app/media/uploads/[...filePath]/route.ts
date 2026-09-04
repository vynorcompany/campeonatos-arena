import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPersistentUploadDirectory } from "@/lib/uploads";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

export async function GET(_: Request, { params }: { params: { filePath: string[] } }) {
  const uploadDirectory = path.resolve(getPersistentUploadDirectory());
  const filePath = path.resolve(uploadDirectory, ...params.filePath);
  const relativePath = path.relative(uploadDirectory, filePath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }

  try {
    const content = await readFile(filePath);
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    return new Response(content, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new Response("Arquivo não encontrado.", { status: 404 });
  }
}
