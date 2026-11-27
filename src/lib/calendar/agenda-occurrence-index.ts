type CourtOccurrence = {occurrenceCourts:{courtId:string}[]} & (
 {startsAt:Date;endsAt:Date} | {startsAtMinute:number;endsAtMinute:number}
);

function minuteOfDay(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

export function buildAgendaOccurrenceIndex<T extends CourtOccurrence>(occurrences: T[], slots: number[]) {
  const byCourtAndSlot = new Map<string, T>();
  const occupiedCourtSlots = new Set<string>();

  for (const occurrence of occurrences) {
    const firstMinute = "startsAtMinute" in occurrence ? occurrence.startsAtMinute : minuteOfDay(occurrence.startsAt);
    const lastMinute = "endsAtMinute" in occurrence ? occurrence.endsAtMinute : minuteOfDay(occurrence.endsAt);
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
