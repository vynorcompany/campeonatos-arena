import "server-only";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { portalArenaSlugForHost } from "@/lib/portal/login-arena-host";
import type { LoginBranding } from "@/lib/backend/contracts/login-branding";

export async function resolveLoginBranding(host: string | null): Promise<LoginBranding> {
  const slug = portalArenaSlugForHost(host, env.portalArenaHosts);
  const arena = slug ? await prisma.arena.findFirst({
    where: { slug, archivedAt: null },
    select: { slug: true, name: true, logoUrl: true, athletePortalLogoUrl: true },
  }) : null;
  const arenas = arena ? [] : await prisma.arena.findMany({where:{archivedAt:null,accountStatus:"ACTIVE"},select:{name:true,slug:true},orderBy:{name:"asc"},take:1000});
  return { arenas, arena: arena ? { name: arena.name, slug: arena.slug, logoUrl: arena.athletePortalLogoUrl || arena.logoUrl } : null };
}
