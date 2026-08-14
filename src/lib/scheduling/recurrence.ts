export type ScheduleOccurrence = {
  startsAt: Date;
  endsAt: Date;
};

export function expandWeeklyOccurrences({
  startsAt,
  endsAt,
  until
}: {
  startsAt: Date;
  endsAt: Date;
  until: Date;
}): ScheduleOccurrence[] {
  const durationMs = endsAt.getTime() - startsAt.getTime();
  const occurrences: ScheduleOccurrence[] = [];

  for (let currentStartsAt = new Date(startsAt); currentStartsAt <= until; currentStartsAt = new Date(currentStartsAt.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    occurrences.push({
      startsAt: currentStartsAt,
      endsAt: new Date(currentStartsAt.getTime() + durationMs)
    });
  }

  return occurrences;
}
