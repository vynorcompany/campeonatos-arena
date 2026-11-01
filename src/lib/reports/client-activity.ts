import type { Prisma } from "@prisma/client";
export type ClientActivity = { active: { id: string; name: string; phone: string }[]; inactive: { id: string; name: string; phone: string }[] };
export function clientActivityWhere(arenaId: string, now = new Date()): Prisma.PlayerWhereInput {
  const since = new Date(now.getTime() - 120 * 86400000);
  const movement: Prisma.FinancialEntryWhereInput = { arenaId, status: { not: "VOIDED" }, OR: [{ createdAt: { gte: since, lte: now } }, { paidAt: { gte: since, lte: now } }, { settlements: { some: { paidAt: { gte: since, lte: now } } } }] };
  return { active: true, OR: [{ financialEntries: { some: movement } }, { scheduleParticipants: { some: { financialEntry: { is: movement } } } }, { comandas: { some: { sale: { is: { financialEntries: { some: movement } } } } } }, { balanceMovements: { some: { createdAt: { gte: since, lte: now } } } }] };
}
export async function loadClientActivity(tx: Prisma.TransactionClient, arenaId: string, now = new Date()): Promise<ClientActivity> {
  const activity = clientActivityWhere(arenaId, now);
  const common = { arenaId, mergedIntoPlayerId: null };
  const select = { id: true, name: true, phone: true };
  const [active, inactive] = await Promise.all([
    tx.player.findMany({ where: { ...common, ...activity }, select, orderBy: { name: "asc" } }),
    tx.player.findMany({ where: { ...common, NOT: activity }, select, orderBy: { name: "asc" } }),
  ]);
  return { active, inactive };
}
