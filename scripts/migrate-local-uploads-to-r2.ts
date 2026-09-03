import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { savePublicImageUpload } from "@/lib/uploads";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function isLegacyUpload(url: string) {
  return url.startsWith("/uploads/");
}

function assertR2Configuration() {
  const required = ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE_URL"];
  if (required.some((name) => !process.env[name]?.trim())) {
    throw new Error("Cloudflare R2 não está configurado. Defina as cinco variáveis R2 antes de migrar uploads.");
  }
}

async function uploadLegacyFile(url: string, arenaId: string, folder: string, prefix: string) {
  const relativePath = url.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const type = mimeTypes[extension];
  if (!type) throw new Error(`Tipo de arquivo não suportado: ${url}`);

  const source = await readFile(absolutePath);
  const file = new File([new Uint8Array(source)], path.basename(absolutePath), { type });
  const uploadedUrl = await savePublicImageUpload(file, folder, prefix, arenaId);
  if (!uploadedUrl || isLegacyUpload(uploadedUrl)) throw new Error("O upload não foi enviado ao R2.");
  return uploadedUrl;
}

async function main() {
  assertR2Configuration();
  const [eventPosts, sponsors] = await Promise.all([
    prisma.portalEventPost.findMany({ where: { imageUrl: { startsWith: "/uploads/" } }, select: { id: true, arenaId: true, imageUrl: true } }),
    prisma.tvSponsor.findMany({ where: { logoUrl: { startsWith: "/uploads/" } }, select: { id: true, arenaId: true, logoUrl: true } })
  ]);

  let migrated = 0;
  for (const post of eventPosts) {
    const imageUrl = await uploadLegacyFile(post.imageUrl, post.arenaId, "portal-events", `event-${post.id}`);
    const result = await prisma.portalEventPost.updateMany({ where: { id: post.id, arenaId: post.arenaId, imageUrl: post.imageUrl }, data: { imageUrl } });
    migrated += result.count;
  }

  for (const sponsor of sponsors) {
    const logoUrl = await uploadLegacyFile(sponsor.logoUrl, sponsor.arenaId, "tv-sponsor-logos", `sponsor-${sponsor.id}`);
    const result = await prisma.tvSponsor.updateMany({ where: { id: sponsor.id, arenaId: sponsor.arenaId, logoUrl: sponsor.logoUrl }, data: { logoUrl } });
    migrated += result.count;
  }

  console.log(`Migração de uploads concluída: ${migrated} arquivo(s) atualizado(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
