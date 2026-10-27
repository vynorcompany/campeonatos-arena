import { getFinancialRecurrenceDateAt, type FinancialRecurrenceFrequency } from "@/lib/finance/recurrences";
import { getOutstandingCents } from "@/lib/finance/settlements";

export const dashboardDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export type ProjectionEntry = { id: string; type: string; status: string; amountCents: number; dueDate: Date | null; recurrenceId: string | null; settlements: Array<{ amountCents: number; interestCents?: number }>; description: string; counterpartyName: string; playerId: string | null };
export type ProjectionRecurrence = { id: string; type: string; active: boolean; amountCents: number; startsAt: Date; endsAt: Date | null; nextDueDate: Date; frequency: string; description: string; counterpartyName: string; playerId: string | null };
export type ProjectedAmount = { id: string; type: string; amountCents: number; outstandingCents: number; date: Date; description: string; counterpartyName: string; playerId: string | null; projected: boolean };

/** Preview only: never materialize charges. A persisted occurrence, including a voided one, replaces its recurrence date. */
export function projectDashboardAmounts(entries: ProjectionEntry[], recurrences: ProjectionRecurrence[], from: Date, to: Date): ProjectedAmount[] {
  const within = (date: Date) => date >= from && date <= to;
  const result: ProjectedAmount[] = entries.filter(entry => entry.status !== "VOIDED" && entry.dueDate && within(entry.dueDate)).map(entry => ({
    id: entry.id, type: entry.type, amountCents: entry.amountCents + entry.settlements.reduce((total, settlement) => total + (settlement.interestCents ?? 0), 0), outstandingCents: entry.status === "PAID" ? 0 : getOutstandingCents(entry.amountCents, entry.settlements), date: entry.dueDate!, description: entry.description, counterpartyName: entry.counterpartyName, playerId: entry.playerId, projected: false,
  }));
  const persisted = new Set(entries.filter(entry => entry.recurrenceId && entry.dueDate).map(entry => `${entry.recurrenceId}:${dashboardDateKey(entry.dueDate!)}`));
  for (const recurrence of recurrences) {
    if (!recurrence.active || !["WEEKLY", "MONTHLY", "ANNUAL"].includes(recurrence.frequency)) continue;
    const frequency = recurrence.frequency as FinancialRecurrenceFrequency;
    const months = (from.getFullYear() - recurrence.startsAt.getFullYear()) * 12 + from.getMonth() - recurrence.startsAt.getMonth();
    const estimate = frequency === "WEEKLY" ? Math.floor((from.getTime() - recurrence.startsAt.getTime()) / (7 * 86_400_000)) : frequency === "ANNUAL" ? Math.floor(months / 12) : months;
    for (let index = Math.max(0, estimate - 2), count = 0; count < 400; index++, count++) {
      const date = getFinancialRecurrenceDateAt(recurrence.startsAt, frequency, index);
      if (date > to || (recurrence.endsAt && date > recurrence.endsAt)) break;
      if (!within(date) || date < recurrence.nextDueDate || persisted.has(`${recurrence.id}:${dashboardDateKey(date)}`)) continue;
      result.push({ id: `recurrence:${recurrence.id}:${dashboardDateKey(date)}`, type: recurrence.type, amountCents: recurrence.amountCents, outstandingCents: recurrence.amountCents, date, description: recurrence.description, counterpartyName: recurrence.counterpartyName, playerId: recurrence.playerId, projected: true });
    }
  }
  return result;
}

/** Divide a reservation across its courts without multiplying revenue or losing cents. */
export function allocateDashboardCourts(amountCents: number, courts: Array<{ id: string; name: string }>) {
  const unique = [...new Map(courts.map(court => [court.id, court])).values()].sort((a, b) => a.id.localeCompare(b.id));
  return unique.map((court, index) => ({ ...court, value: Math.floor(amountCents / unique.length) + (index < amountCents % unique.length ? 1 : 0) }));
}
export function dashboardPercent(numerator: number, denominator: number) { return denominator > 0 ? numerator / denominator * 100 : null; }

type Interval = [number, number];
function mergeIntervals(intervals: Interval[]): Interval[] {
  const merged: Interval[] = [];
  for (const interval of intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
    else merged.push([...interval]);
  }
  return merged;
}
/** Time coverage, not a sum of reservations: overlapping rules/bookings must not inflate occupancy. */
export function dashboardCourtOccupancy(courts: Array<{ id: string; name: string; weeklyRules: Array<{ weekday: number; available: boolean; startsAtMinute: number; endsAtMinute: number }> }>, occurrences: Array<{ startsAt: Date; endsAt: Date; occurrenceCourts: Array<{ courtId: string }> }>, from: Date, to: Date) {
  const courtInsights = courts.map(court => {
    const available: Interval[] = [];
    for (const day = new Date(from.getFullYear(), from.getMonth(), from.getDate()); day <= to; day.setDate(day.getDate() + 1)) for (const rule of court.weeklyRules) {
      if (!rule.available || rule.weekday !== day.getDay()) continue;
      const start = new Date(day); start.setMinutes(rule.startsAtMinute);
      const end = new Date(day); end.setMinutes(rule.endsAtMinute);
      available.push([Math.max(from.getTime(), start.getTime()), Math.min(to.getTime() + 1, end.getTime())]);
    }
    const availability = mergeIntervals(available);
    const bookings = occurrences.filter(item => item.occurrenceCourts.some(relation => relation.courtId === court.id));
    const reserved = mergeIntervals(bookings.map(item => [Math.max(from.getTime(), item.startsAt.getTime()), Math.min(to.getTime() + 1, item.endsAt.getTime())]));
    let occupiedMilliseconds = 0, a = 0, b = 0;
    while (a < availability.length && b < reserved.length) {
      const start = Math.max(availability[a][0], reserved[b][0]), end = Math.min(availability[a][1], reserved[b][1]);
      occupiedMilliseconds += Math.max(0, end - start);
      if (availability[a][1] < reserved[b][1]) a++; else b++;
    }
    return { courtId: court.id, courtName: court.name, reservations: bookings.length, occupiedMinutes: Math.round(occupiedMilliseconds / 60_000), availableMinutes: Math.round(availability.reduce((total, [start, end]) => total + end - start, 0) / 60_000) };
  });
  return { courtInsights, occupiedMinutes: courtInsights.reduce((total, court) => total + court.occupiedMinutes, 0), availableMinutes: courtInsights.reduce((total, court) => total + court.availableMinutes, 0) };
}
