import "server-only";
import { withArenaTransaction } from "@/lib/rls";
import { buildCourtBookingAvailability } from "@/lib/calendar/booking-availability";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { courtRulesForDate } from "@/lib/calendar/date-availability";
import { agendaVersion, agendaVersionSelect } from "@/lib/calendar/agenda-version";
import { agendaDayInputSchema, parseAgendaDay } from "@/lib/backend/contracts/agenda-day";
import { agendaAvailabilityInputSchema, agendaAvailabilitySchema, agendaVersionSchema } from "@/lib/backend/contracts/agenda-queries";
const minute = (date: Date) => date.getHours()*60+date.getMinutes();
function range(value: string) { const start = parseAgendaDay(value)!; const end = new Date(start); end.setDate(end.getDate()+1); return { start, end }; }
export async function resolveAgendaAvailability(arenaId: string, input: { date: string; courtId: string; occurrenceId?: string }) {
  agendaAvailabilityInputSchema.parse(input);
  const { start, end } = range(input.date);
  return withArenaTransaction(arenaId, async tx => {
    const court = await tx.court.findFirst({ where: { id: input.courtId, arenaId, active: true }, select: { id: true, onlineSlotMinutes: true, dateAvailability: true, weeklyRules: { select: { weekday: true, startsAtMinute: true, endsAtMinute: true, priceCents: true, available: true } } } });
    if (!court) return null;
    if (input.occurrenceId && !await tx.scheduleOccurrence.findFirst({ where: { id: input.occurrenceId, arenaId, ...activeCourtOccurrenceWhere() }, select: { id: true } })) return null;
    const occurrences = await tx.scheduleOccurrence.findMany({ where: { arenaId, id: input.occurrenceId ? { not: input.occurrenceId } : undefined, ...activeCourtOccurrenceWhere(), startsAt: { lt: end }, endsAt: { gt: start }, occurrenceCourts: { some: { courtId: court.id } } }, select: { startsAt: true, endsAt: true } });
    return agendaAvailabilitySchema.parse({ slotMinutes: court.onlineSlotMinutes, availableMinutes: buildCourtBookingAvailability({ weekday: start.getDay(), slotMinutes: court.onlineSlotMinutes, rules: courtRulesForDate(court.weeklyRules, court.dateAvailability, start), occupiedIntervals: occurrences.map(occurrence => ({ startsAtMinute: occurrence.startsAt <= start ? 0 : minute(occurrence.startsAt), endsAtMinute: occurrence.endsAt >= end ? 1440 : minute(occurrence.endsAt) })) }) });
  }, { maxWait: 10000, timeout: 10000 });
}
export async function resolveAgendaVersion(arenaId: string, date: string) {
  agendaDayInputSchema.parse({ date });
  const { start, end } = range(date);
  const rows = await withArenaTransaction(arenaId, tx => tx.scheduleOccurrence.findMany({ where: { arenaId, ...activeCourtOccurrenceWhere(), startsAt: { lt: end }, endsAt: { gt: start } }, select: agendaVersionSelect, orderBy: [{ startsAt: "asc" }, { id: "asc" }] }), { maxWait: 10000, timeout: 5000 });
  return agendaVersionSchema.parse({ version: agendaVersion(rows) });
}
