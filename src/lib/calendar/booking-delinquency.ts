import { Prisma } from "@prisma/client";
import { arenaToday } from "@/lib/calendar/arena-wall-clock";
import { getOutstandingCents } from "@/lib/finance/settlements";
import type { ArenaTransaction } from "@/lib/rls";

export type BookingDelinquency = { blocked: boolean; count: number; outstandingCents: number };

/** The first day after the due date is day one of delinquency. */
export function bookingDelinquencyCutoff(days: number, today = arenaToday()) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return cutoff;
}

export async function getBookingDelinquency(
  tx: ArenaTransaction,
  arenaId: string,
  playerId: string,
  blockAfterDays: number | null,
  today = arenaToday(),
): Promise<BookingDelinquency> {
  if (blockAfterDays === null) return { blocked: false, count: 0, outstandingCents: 0 };
  const ownedReceivable = {
    arenaId,
    type: { in: ["REVENUE", "INCOME"] },
    status: { in: ["PENDING", "OVERDUE"] },
    dueDate: { lt: bookingDelinquencyCutoff(blockAfterDays, today) },
    OR: [{ playerId }, { sale: { comanda: { playerId } } }],
  } satisfies Prisma.FinancialEntryWhereInput;
  const entries = await tx.financialEntry.findMany({
    where: ownedReceivable,
    select: { amountCents: true, settlements: { select: { amountCents: true, interestCents: true } } },
  });
  const balances = entries.map((entry) => getOutstandingCents(entry.amountCents, entry.settlements)).filter((balance) => balance > 0);
  return { blocked: balances.length > 0, count: balances.length, outstandingCents: balances.reduce((sum, amount) => sum + amount, 0) };
}
