import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { getPersistentUploadDirectory, savePublicImageUpload } from "@/lib/uploads";
import { isLocalUploadUrl, resolveLocalUploadPath } from "./local-upload-path";
import { verifyPublicCopy } from "./r2-copy-verification";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

function assertR2Configuration() {
  const required = ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE_URL"];
  if (required.some((name) => !process.env[name]?.trim())) {
    throw new Error("Cloudflare R2 não está configurado. Defina as cinco variáveis R2 antes de migrar uploads.");
  }
}

async function uploadLegacyFile(url: string, arenaId: string, folder: string, prefix: string) {
  const { absolutePath, source } = await readLegacyFile(url);
  const extension = path.extname(absolutePath).toLowerCase();
  const type = mimeTypes[extension];
  if (!type) throw new Error(`Tipo de arquivo não suportado: ${url}`);

  const file = new File([new Uint8Array(source)], path.basename(absolutePath), { type });
  const uploadedUrl = await savePublicImageUpload(file, folder, prefix, arenaId);
  if (!uploadedUrl || isLocalUploadUrl(uploadedUrl)) throw new Error("O upload não foi enviado ao R2.");
  await verifyPublicCopy(uploadedUrl, source);
  return uploadedUrl;
}

async function readLegacyFile(url: string) {
  const absolutePath = resolveLocalUploadPath(url, path.join(process.cwd(), "public", "uploads"), getPersistentUploadDirectory());
  if (!absolutePath) throw new Error(`O arquivo não é um upload local: ${url}`);
  return { absolutePath, source: await readFile(absolutePath) };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun) assertR2Configuration();
  const [eventPosts, arenas] = await Promise.all([
    prisma.portalEventPost.findMany({ where: { OR: [{ imageUrl: { startsWith: "/uploads/" } }, { imageUrl: { startsWith: "/media/uploads/" } }] }, select: { id: true, arenaId: true, imageUrl: true } }),
    prisma.arena.findMany({ select: { id: true } })
  ]);

  let migrated = 0;
  for (const post of eventPosts) {
    if (dryRun) {
      await readLegacyFile(post.imageUrl);
      migrated++;
      continue;
    }
    const imageUrl = await uploadLegacyFile(post.imageUrl, post.arenaId, "portal-events", `event-${post.id}`);
    const result = await prisma.portalEventPost.updateMany({ where: { id: post.id, arenaId: post.arenaId, imageUrl: post.imageUrl }, data: { imageUrl } });
    migrated += result.count;
  }

  for (const arena of arenas) {
    const db = arenaDatabase(arena.id);
    const sponsors = await db.tvSponsor.findMany({ where: { arenaId: arena.id, OR: [{ logoUrl: { startsWith: "/uploads/" } }, { logoUrl: { startsWith: "/media/uploads/" } }] }, select: { id: true, arenaId: true, logoUrl: true } });
    for (const sponsor of sponsors) {
      if (dryRun) {
        await readLegacyFile(sponsor.logoUrl);
        migrated++;
        continue;
      }
      const logoUrl = await uploadLegacyFile(sponsor.logoUrl, sponsor.arenaId, "tv-sponsor-logos", `sponsor-${sponsor.id}`);
      const result = await db.tvSponsor.updateMany({ where: { id: sponsor.id, arenaId: sponsor.arenaId, logoUrl: sponsor.logoUrl }, data: { logoUrl } });
      migrated += result.count;
    }
  }

  console.log(`${dryRun ? "Prévia da migração" : "Migração de uploads concluída"}: ${migrated} arquivo(s) ${dryRun ? "local(is) referenciado(s) e legível(is)" : "atualizado(s)"}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
