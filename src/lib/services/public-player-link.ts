import "server-only";

import { normalizeBrazilianPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * Older tournament registrations can point to a legacy Player record while a
 * newer PlayerAccount points to the same verified phone. Treat only unclaimed
 * legacy records with that exact normalized phone as the athlete's record.
 * This avoids granting access to another portal account that merely shares a
 * household phone number.
 */
export async function getPublicLinkedPlayerIds(arenaId: string, playerId: string) {
  const current = await prisma.player.findFirst({
    where: { id: playerId, arenaId, active: true },
    select: { id: true, phone: true },
  });
  if (!current) return [playerId];
  const phone = normalizeBrazilianPhone(current.phone);
  if (!phone) return [playerId];
  const players = await prisma.player.findMany({
    where: { arenaId, phone: { not: "" } },
    select: { id: true, phone: true, account: { select: { id: true } } },
  });
  return players
    .filter((player) => player.id === playerId || (!player.account && normalizeBrazilianPhone(player.phone) === phone))
    .map((player) => player.id);
}
