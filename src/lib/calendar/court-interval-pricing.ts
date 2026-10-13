type CourtRule = {
  weekday: number;
  startsAtMinute: number;
  endsAtMinute: number;
  priceCents: number;
  available?: boolean;
};

export function isCourtBookingStartOnGrid(startsAtMinute: number, scheduleStartMinute: number, scheduleEndMinute: number, slotMinutes: number) {
  return Number.isInteger(startsAtMinute)
    && Number.isInteger(scheduleStartMinute)
    && Number.isInteger(scheduleEndMinute)
    && Number.isInteger(slotMinutes)
    && slotMinutes > 0
    && startsAtMinute >= scheduleStartMinute
    && startsAtMinute < scheduleEndMinute
    && scheduleEndMinute <= 24 * 60
    && (startsAtMinute - scheduleStartMinute) % slotMinutes === 0;
}

export function calculateCourtIntervalPrice({ startsAtMinute, durationMinutes, intervalMinutes, weekday, rules }: { startsAtMinute: number; durationMinutes: number; intervalMinutes: number; weekday: number; rules: CourtRule[] }) {
  if (durationMinutes <= 0 || intervalMinutes <= 0 || durationMinutes % intervalMinutes !== 0) return null;

  let totalCents = 0;
  for (let minute = startsAtMinute; minute < startsAtMinute + durationMinutes; minute += intervalMinutes) {
    const rule = rules.find((item) => item.weekday === weekday && item.available !== false && item.startsAtMinute <= minute && item.endsAtMinute >= minute + intervalMinutes);
    if (!rule) return null;
    totalCents += rule.priceCents;
  }
  return totalCents;
}
