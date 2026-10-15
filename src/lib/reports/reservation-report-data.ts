import type { Prisma, PrismaClient } from "@prisma/client";

export async function loadReservationReportOccurrences(
  db: Pick<PrismaClient, "scheduleOccurrence">,
  where: Prisma.ScheduleOccurrenceWhereInput,
) {
  return Promise.all([
    db.scheduleOccurrence.findMany({ where, select: { id: true, createdAt: true, startsAt: true, endsAt: true, status: true, sourceType: true, bookingTypeName: true, occurrenceCourts: { select: { courtId: true } }, _count: { select: { participants: true } } } }),
    db.scheduleOccurrence.findMany({ where, include: { occurrenceCourts: { include: { court: true } }, participants: true }, orderBy: { startsAt: "desc" }, take: 250 })
  ]);
}
