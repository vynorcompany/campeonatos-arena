import type { ArenaTransaction } from "@/lib/rls";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";

export async function isCourtSlotAvailable(tx: ArenaTransaction, arenaId: string, courtId: string, startsAt: Date, endsAt: Date) {
  // All writers must lock the court before checking the slot, so two requests
  // cannot both observe it as free and create overlapping occurrences.
  const lockedCourt = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Court" WHERE "id" = ${courtId} AND "arenaId" = ${arenaId} AND "active" = true FOR UPDATE`;
  if (!lockedCourt.length) return false;
  const conflict = await tx.scheduleOccurrence.findFirst({
    where: { arenaId, ...activeCourtOccurrenceWhere(), startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId } } },
    select: { id: true },
  });
  return !conflict;
}
