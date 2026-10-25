import "server-only";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
export async function getPublicLegalArena(slug: string, path: string) {
  const arena = await prisma.arena.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, legalName: true, cnpj: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true } });
  if (arena) return arena;
  const alias = await prisma.arenaPublicSlug.findUnique({ where: { slug }, select: { arena: { select: { slug: true } } } });
  if (alias) redirect(`/classificacao/${encodeURIComponent(alias.arena.slug)}/${path}`);
  notFound();
}
