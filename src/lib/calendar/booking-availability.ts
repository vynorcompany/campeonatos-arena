type CourtRule = {
  weekday: number;
  startsAtMinute: number;
  endsAtMinute: number;
  available?: boolean;
};

type OccupiedInterval = {
  startsAtMinute: number;
  endsAtMinute: number;
};

export function buildCourtBookingAvailability({
  weekday,
  slotMinutes,
  rules,
  occupiedIntervals,
}: {
  weekday: number;
  slotMinutes: number;
  rules: CourtRule[];
  occupiedIntervals: OccupiedInterval[];
}) {
  if (slotMinutes <= 0) return [];

  const available: number[] = [];
  for (let minute = 0; minute + slotMinutes <= 24 * 60; minute += slotMinutes) {
    const hasRule = rules.some((rule) => (
      rule.weekday === weekday
      && rule.available !== false
      && rule.startsAtMinute <= minute
      && rule.endsAtMinute >= minute + slotMinutes
    ));
    const isOccupied = occupiedIntervals.some((interval) => (
      interval.startsAtMinute < minute + slotMinutes
      && interval.endsAtMinute > minute
    ));

    if (hasRule && !isOccupied) available.push(minute);
  }
  return available;
}

export function endMinutesForBookingStart({
  startMinute,
  slotMinutes,
  availableMinutes,
}: {
  startMinute: number;
  slotMinutes: number;
  availableMinutes: number[];
}) {
  const available = new Set(availableMinutes);
  const ends: number[] = [];

  for (let minute = startMinute; available.has(minute); minute += slotMinutes) {
    ends.push(minute + slotMinutes);
  }
  return ends;
}
