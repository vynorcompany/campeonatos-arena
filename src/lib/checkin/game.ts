import type { Prisma } from "@prisma/client";

/** Court booking sources that a guest can discover and join through check-in. */
export const checkinGameSources = ["BOOKING", "COURT_BOOKING", "ONLINE_BOOKING"];

export const checkinGameWhere = { sourceType: { in: checkinGameSources }, teacherId: null, NOT: { bookingTypeName: { in: ["Aula", "Aula fixa"], mode: "insensitive" } } } satisfies Prisma.ScheduleOccurrenceWhereInput;

export function gameCheckinPath(arenaSlug: string, token: string, occurrenceId: string) {
  return `/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}&jogo=${encodeURIComponent(occurrenceId)}`;
}
