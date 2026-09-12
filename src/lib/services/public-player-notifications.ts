import "server-only";

import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getOutstandingCents } from "@/lib/finance/settlements";

export type AthletePortalNotification = {
  id: string;
  source: "PLAYER" | "ARENA" | "FINANCE";
  title: string;
  message: string;
  href: string;
  createdAt: string;
};

export async function getAthletePortalNotifications(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return [] as AthletePortalNotification[];
  const now = new Date();
  const [playerNotifications, announcements, entries] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.playerNotification.findMany({ where: { playerId, readAt: null }, orderBy: { createdAt: "desc" }, take: 16, select: { id: true, title: true, message: true, href: true, createdAt: true } }),
    tx.portalAnnouncement.findMany({ where: { arenaId: arena.id, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, message: true, createdAt: true } }),
    tx.financialEntry.findMany({ where: { arenaId: arena.id, playerId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] }, onlinePaymentUrl: { not: "" } }, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 12, select: { id: true, description: true, amountCents: true, dueDate: true, createdAt: true, settlements: { select: { amountCents: true, interestCents: true } } } }),
  ]));
  const financial = entries.map((entry) => ({ entry, outstandingCents: getOutstandingCents(entry.amountCents, entry.settlements) })).filter(({ outstandingCents }) => outstandingCents > 0).map(({ entry, outstandingCents }) => ({ id: `finance-${entry.id}`, source: "FINANCE" as const, title: "Boleto disponível", message: `${entry.description || "Lançamento financeiro"} · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(outstandingCents / 100)}`, href: `/classificacao/${arenaSlug}/cobranca/${entry.id}`, createdAt: entry.createdAt.toISOString() }));
  return [
    ...playerNotifications.map((notification) => ({ id: notification.id, source: "PLAYER" as const, title: notification.title, message: notification.message, href: notification.href || `/classificacao/${arenaSlug}`, createdAt: notification.createdAt.toISOString() })),
    ...announcements.map((announcement) => ({ id: `arena-${announcement.id}`, source: "ARENA" as const, title: announcement.title, message: announcement.message, href: `/classificacao/${arenaSlug}?section=home`, createdAt: announcement.createdAt.toISOString() })),
    ...financial,
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 20);
}
