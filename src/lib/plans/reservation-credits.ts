import type { Prisma } from "@prisma/client";
import { fixedMonthAmount } from "./fixed-court";

export const RESERVATION_CREDIT_METHOD = "RESERVATION_CREDIT";
const redemptionReference = (occurrenceId: string) => `Reserva paga com crédito · ${occurrenceId}`;

// Paid monthly entries are the grants. Each immutable RESERVATION movement is one
// redemption; zero monetary/class deltas keep these units out of the other wallets.
export async function reservationCreditGrants(tx: Prisma.TransactionClient, arenaId: string, playerIds: string[]) {
  if (!playerIds.length) return [];
  const entries = await tx.financialEntry.findMany({ where: { arenaId, playerId: { in: playerIds }, source: "FIXED_COURT_PLAN", status: "PAID", voidedAt: null }, select: { id: true, playerId: true, externalReference: true, competenceDate: true, dueDate: true, notes: true } });
  const series = await tx.scheduleBookingSeries.findMany({ where: { arenaId, id: { in: entries.flatMap(e => e.externalReference ? [e.externalReference] : []) } }, select: { id: true, responsiblePlayerId: true, startsAt: true, occurrences: { take: 1, orderBy: { startsAt: "asc" }, select: { startsAt: true, endsAt: true } } } });
  const byId = new Map(series.map(s => [s.id, s]));
  return entries.flatMap(entry => {
    const plan = entry.externalReference ? byId.get(entry.externalReference) : undefined;
    const cycle = entry.competenceDate ?? entry.dueDate;
    const first = plan?.occurrences[0];
    if (!plan || plan.responsiblePlayerId !== entry.playerId || !cycle || !first || !entry.playerId) return [];
    const weekday = new Date(plan.startsAt.getTime() - 3 * 3600000).getUTCDay();
    return [{ entryId: entry.id, playerId: entry.playerId, quantity: Number(entry.notes.match(/(?:^|; )(\d+) créditos de reserva/)?.[1]) || Number(entry.notes.match(/(?:^|; )(\d+) ocorrências no mês/)?.[1]) || fixedMonthAmount(0, cycle.getUTCFullYear(), cycle.getUTCMonth(), weekday, false).occurrences, durationMinutes: Math.round((first.endsAt.getTime() - first.startsAt.getTime()) / 60000) }];
  });
}
export async function reservationCreditBalances(tx: Prisma.TransactionClient, arenaId: string, playerIds: string[]) {
  const [grants, uses] = await Promise.all([
    reservationCreditGrants(tx, arenaId, playerIds),
    tx.clientBalanceMovement.findMany({ where: { arenaId, playerId: { in: playerIds }, kind: "RESERVATION" }, select: { playerId: true } })
  ]);
  const balances = new Map<string, number>();
  for (const grant of grants) balances.set(grant.playerId, (balances.get(grant.playerId) ?? 0) + grant.quantity);
  for (const use of uses) balances.set(use.playerId, (balances.get(use.playerId) ?? 0) - 1);
  for (const [id, amount] of balances) balances.set(id, Math.max(0, amount));
  return balances;
}
export async function redeemReservationCredit(tx: Prisma.TransactionClient, arenaId: string, playerId: string, occurrenceId: string, durationMinutes: number) {
  await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${playerId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const reference = redemptionReference(occurrenceId);
  const existing = await tx.clientBalanceMovement.findFirst({ where: { arenaId, playerId, kind: "RESERVATION", reason: { startsWith: reference + " · mensalidade " } } });
  const grants = await reservationCreditGrants(tx, arenaId, [playerId]);
  if (existing) {
    if (!grants.some(g => existing.reason.endsWith(` · mensalidade ${g.entryId}`) && g.durationMinutes >= durationMinutes)) throw new Error("Sem crédito de reserva disponível para esta duração. Confira o pagamento do plano.");
    return;
  }
  const uses = await tx.clientBalanceMovement.findMany({ where: { arenaId, playerId, kind: "RESERVATION" }, select: { reason: true } });
  if (grants.reduce((sum,g) => sum + g.quantity,0) <= uses.length) throw new Error("Sem crédito de reserva disponível para esta duração. Confira o pagamento do plano.");
  const usedByEntry = new Map<string, number>();
  for (const use of uses) {
    const entryId = use.reason.split(" · mensalidade ").at(-1)!;
    usedByEntry.set(entryId, (usedByEntry.get(entryId) ?? 0) + 1);
  }
  const grant = grants.find(g => g.durationMinutes >= durationMinutes && (usedByEntry.get(g.entryId) ?? 0) < g.quantity);
  if (!grant) throw new Error("Sem crédito de reserva disponível para esta duração. Confira o pagamento do plano.");
  await tx.clientBalanceMovement.create({ data: { arenaId, playerId, kind: "RESERVATION", reason: `${reference} · mensalidade ${grant.entryId}` } });
}
