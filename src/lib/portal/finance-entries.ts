import { Prisma } from "@prisma/client";
import type { ArenaTransaction } from "@/lib/rls";

const selectedEntry = { id: true, description: true, amountCents: true, dueDate: true, status: true, paidAt: true, onlinePaymentUrl: true, source: true, plan: { select: { name: true } }, sale: { select: { code: true, comanda: { select: { code: true, items: { select: { quantity: true, product: { select: { name: true } } } } } } } }, scheduleParticipant: { select: { occurrence: { select: { title: true, startsAt: true, occurrenceCourts: { select: { court: { select: { name: true } } } } } } } }, settlements: { select: { amountCents: true, interestCents: true } } } as const;

/** Pending debts are complete; paid history is intentionally limited to the latest 12. */
export function loadPortalFinancialEntries(tx: ArenaTransaction, arenaId: string, playerId: string, deadline: Date) {
  const ownedEntries = { arenaId, OR: [
    { playerId, type: "REVENUE" },
    { type: "REVENUE", sale: { comanda: { playerId } } },
    { type: "INCOME", status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, sale: { comanda: { playerId } } },
  ] } satisfies Prisma.FinancialEntryWhereInput;
  return Promise.all([
    tx.financialEntry.findMany({
      where: { ...ownedEntries, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }, AND: [{ OR: [{ status: "OVERDUE" }, { dueDate: { lte: deadline } }] }] },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      select: selectedEntry,
    }),
    tx.financialEntry.findMany({
      where: { ...ownedEntries, status: "PAID" },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: selectedEntry,
    }),
  ]);
}
