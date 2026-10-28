import { arenaWallClockToInstant, instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import type { Prisma } from "@prisma/client";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";

export const dashboardEntrySelect = {
  id: true, type: true, category: true, status: true, amountCents: true, dueDate: true, paidAt: true, description: true, counterpartyName: true, paymentMethod: true, recurrenceId: true, playerId: true,
  player: { select: { id: true, name: true } },
  sale: { select: { comanda: { select: { playerId: true, player: { select: { name: true } } } } } },
  settlements: { select: { id: true, amountCents: true, interestCents: true, discountCents: true, paidAt: true, paymentMethod: true } },
  scheduleParticipant: { select: { playerId: true, player: { select: { name: true } }, occurrence: { select: { occurrenceCourts: { select: { courtId: true, court: { select: { name: true } } } } } } } },
} satisfies Prisma.FinancialEntrySelect;
export type DashboardEntry = Prisma.FinancialEntryGetPayload<{ select: typeof dashboardEntrySelect }>;

export async function loadDashboardData(arenaId: string, from: Date, to: Date, horizonEnd: Date, previousFrom?: Date, previousTo?: Date) {
  const { withArenaTransaction } = await import("@/lib/rls");
  const period = { gte: from, lte: to };
  const cashPeriod = { gte: arenaWallClockToInstant(from), lte: arenaWallClockToInstant(to) };
  const previousCashPeriod = previousFrom && previousTo ? { gte: arenaWallClockToInstant(previousFrom), lte: arenaWallClockToInstant(previousTo) } : undefined;
  return withArenaTransaction(arenaId, async tx => {
    const [entries, recurrences, occurrences, courts, lessons, portalAccounts, saleGroups, products, previousEntries, previousReservations] = await Promise.all([
      tx.financialEntry.findMany({ where: { arenaId, OR: [{ dueDate: { gte: from, lte: horizonEnd } }, { paidAt: cashPeriod }, { settlements: { some: { paidAt: cashPeriod } } }] }, select: dashboardEntrySelect }),
      tx.financialRecurrence.findMany({ where: { arenaId, active: true, startsAt: { lte: horizonEnd }, OR: [{ endsAt: null }, { endsAt: { gte: from } }] } }),
      tx.scheduleOccurrence.findMany({ where: { arenaId, startsAt: { lte: horizonEnd }, endsAt: { gte: from } }, include: { occurrenceCourts: { include: { court: { select: { name: true } } } }, participants: { include: { player: { select: { name: true } }, financialEntry: { select: { status: true } } } }, teacher: { select: { name: true } } } }),
      tx.court.findMany({ where: { arenaId, active: true }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
      tx.lesson.findMany({ where: { arenaId, scheduledAt: period, status: { notIn: ["CANCELED", "CANCELLED"] } }, include: { teacher: { select: { name: true } }, attendances: { include: { student: { select: { playerId: true, name: true } } } } } }),
      tx.playerAccount.findMany({ where: { arenaId, createdAt: cashPeriod }, select: { id: true, phone: true, createdAt: true, player: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }),
      tx.saleItem.groupBy({ where: { sale: { arenaId, createdAt: cashPeriod, status: { notIn: ["VOIDED", "CANCELED", "CANCELLED"] } } }, by: ["productId"], _sum: { quantity: true, totalCents: true } }),
      tx.product.findMany({ where: { arenaId }, select: { id: true, name: true, costCents: true, isService: true } }),
      previousFrom && previousTo ? tx.financialEntry.findMany({ where: { arenaId, OR: [{ dueDate: { gte: previousFrom, lte: previousTo } }, { paidAt: previousCashPeriod }, { settlements: { some: { paidAt: previousCashPeriod } } }] }, select: dashboardEntrySelect }) : Promise.resolve([]),
      previousFrom && previousTo ? tx.scheduleOccurrence.count({ where: { arenaId, startsAt: { lte: previousTo }, endsAt: { gte: previousFrom }, bookingTypeName: { not: "Bloqueio" }, NOT: { OR: [{ sourceType: { in: ["LESSON", "LESSON_MAKEUP"] } }, { bookingTypeName: { contains: "aula", mode: "insensitive" } }, { bookingTypeName: { contains: "reposi", mode: "insensitive" } }] }, ...activeCourtOccurrenceWhere() } }) : Promise.resolve(0),
    ]);
    return { entries, recurrences, occurrences, courts, lessons, portalAccounts, saleGroups, products, previousEntries, previousReservations };
  }, { maxWait: 20_000, timeout: 20_000 });
}

export function dashboardFinancialRows(entries: DashboardEntry[], view: "caixa" | "competencia", from: Date, to: Date) {
  const within = (date: Date | null) => date && date >= from && date <= to;
  const cashFrom = arenaWallClockToInstant(from), cashTo = arenaWallClockToInstant(to);
  const paidWithin = (date: Date | null) => date && date >= cashFrom && date <= cashTo;
  return entries.filter(entry => entry.status !== "VOIDED").flatMap(entry => {
    const playerId = entry.playerId || entry.scheduleParticipant?.playerId || entry.sale?.comanda?.playerId || null;
    const name = entry.player?.name || entry.scheduleParticipant?.player.name || entry.sale?.comanda?.player?.name || entry.counterpartyName || "Cliente não identificado";
    const base = { ...entry, playerId, counterpartyName: name };
    if (view === "competencia") return within(entry.dueDate) ? [{ ...base, value: entry.amountCents, date: entry.dueDate! }] : [];
    if (entry.settlements.length) return entry.settlements.filter(settlement => paidWithin(settlement.paidAt)).map(settlement => ({ ...base, id: `${entry.id}:${settlement.id}`, value: settlement.amountCents, date: instantToArenaWallClock(settlement.paidAt), paymentMethod: settlement.paymentMethod }));
    return entry.status === "PAID" && paidWithin(entry.paidAt) ? [{ ...base, value: entry.amountCents, date: instantToArenaWallClock(entry.paidAt!) }] : [];
  });
}
