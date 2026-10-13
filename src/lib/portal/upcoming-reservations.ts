import type { Prisma } from "@prisma/client";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";

export function upcomingPlayerReservationsWhere(arenaId: string, playerId: string, now = new Date()): Prisma.ScheduleOccurrenceWhereInput {
  return {
    arenaId,
    startsAt: { gte: instantToArenaWallClock(now) },
    ...activeCourtOccurrenceWhere(now),
    participants: { some: { playerId } },
  };
}
