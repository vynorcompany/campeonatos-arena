type CourtOccurrence = {
  startsAt: Date;
  endsAt: Date;
  occurrenceCourts: { courtId: string }[];
};

function minuteOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

export function buildAgendaOccurrenceIndex<T extends CourtOccurrence>(occurrences: T[], slots: number[]) {
  const byCourtAndSlot = new Map<string, T>();
  const occupiedCourtSlots = new Set<string>();

  for (const occurrence of occurrences) {
    const firstMinute = minuteOfDay(occurrence.startsAt);
    const lastMinute = minuteOfDay(occurrence.endsAt);
    for (const { courtId } of occurrence.occurrenceCourts) {
      const startKey = `${courtId}:${firstMinute}`;
      if (!byCourtAndSlot.has(startKey)) byCourtAndSlot.set(startKey, occurrence);
      for (const slot of slots) {
        if (firstMinute < slot && lastMinute > slot) occupiedCourtSlots.add(`${courtId}:${slot}`);
      }
    }
  }

  return { byCourtAndSlot, occupiedCourtSlots };
}
