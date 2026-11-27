import "server-only";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { portalArenaSlugForHost } from "@/lib/portal/login-arena-host";
import type { LoginBranding } from "@/lib/backend/contracts/login-branding";

export async function resolveLoginBranding(host: string | null): Promise<LoginBranding> {
  const slug = portalArenaSlugForHost(host, env.portalArenaHosts);
  const arena = slug ? await prisma.arena.findFirst({
    where: { slug, archivedAt: null },
    select: { name: true, logoUrl: true, athletePortalLogoUrl: true },
  }) : null;
  return { arena: arena ? { name: arena.name, logoUrl: arena.athletePortalLogoUrl || arena.logoUrl } : null };
}
