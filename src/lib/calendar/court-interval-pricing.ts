type CourtRule = {
  weekday: number;
  startsAtMinute: number;
  endsAtMinute: number;
  priceCents: number;
  available?: boolean;
};

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
