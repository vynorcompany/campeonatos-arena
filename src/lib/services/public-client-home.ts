import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);

export async function getPublicClientHome(arenaSlug: string, playerId: string) {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;
  const player = await prisma.player.findFirst({ where: { id: playerId, arenaId: arena.id }, select: { name: true } });
  if (!player) return null;
  const now = new Date();
  const [announcements, events, eventPosts, student, reservations, pairs, entries] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.portalAnnouncement.findMany({ where: { arenaId: arena.id, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, title: true, message: true } }),
    tx.calendarEvent.findMany({ where: { arenaId: arena.id, featuredInPortal: true, scheduledAt: { gte: now } }, orderBy: { scheduledAt: "asc" }, take: 4, select: { id: true, title: true, notes: true, scheduledAt: true } }),
    tx.portalEventPost.findMany({ where: { arenaId: arena.id, active: true }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, caption: true, imageUrl: true, linkUrl: true } }),
    tx.student.findFirst({ where: { arenaId: arena.id, playerId }, select: { remainingClasses: true } }),
    tx.scheduleOccurrence.count({ where: { arenaId: arena.id, startsAt: { gte: now }, status: { not: "CANCELED" }, participants: { some: { playerId } } } }),
    tx.categoryPair.count({ where: { active: true, players: { some: { playerId } }, competition: { format: "LEAGUE", status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } } } }),
    tx.financialEntry.findMany({ where: { arenaId: arena.id, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] }, counterpartyName: player.name }, select: { amountCents: true } })
  ]));
  const due = entries.reduce((total, entry) => total + entry.amountCents, 0);
  return { announcements, events: events.map((event) => ({ ...event, when: date(event.scheduledAt) })), eventPosts, summary: { financial: due ? `${money(due)} em aberto` : "Em dia", financialStatus: due ? "pending" : "active", classes: student?.remainingClasses ?? 0, reservations, leagues: pairs } };
}
