import "server-only";
import { courtRulesForDate } from "@/lib/calendar/date-availability";
import { readServiceBookingRules, servicePermitsInterval, serviceRuleDetails } from "@/lib/calendar/service-booking-rules";
import { peakServiceOccupancy } from "@/lib/calendar/service-capacity";
import { arenaDatabase } from "@/lib/arena-database";
import { getPublicPlayerAuth } from "@/lib/backend/services/player-session";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";
import { activeCourtOccurrenceWhere, pendingPlayerOnlineBookingWhere } from "@/lib/calendar/online-booking-hold";
import { arenaToday, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { getBookingDelinquency, type BookingDelinquency } from "@/lib/calendar/booking-delinquency";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { parseAgendaDay } from "@/lib/backend/contracts/agenda-day";
import { publicBookingViewInputSchema, publicBookingViewSchema } from "@/lib/backend/contracts/public-booking-view";
function dateValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
export async function resolvePublicBookingView(input: { arenaSlug: string; date?: string; matchId?: string }) {
  const { arenaSlug, date, matchId } = publicBookingViewInputSchema.parse(input);
  const scope = await prisma.arena.findUnique({ where: { slug: arenaSlug, archivedAt: null }, select: { id: true } });
  if (!scope) return null;
  const db = arenaDatabase(scope.id);
  const selectedDate = date ? parseAgendaDay(date)! : arenaToday();
  const today = arenaToday();
  const nextDay = new Date(selectedDate); nextDay.setDate(nextDay.getDate() + 1);
  const [arena, currentClient] = await Promise.all([db.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true, name: true, logoUrl: true, scheduleStartMinute: true, scheduleEndMinute: true, checkinEnabled: true, onlineBookingEnabled: true, onlineBookingLayout: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, onlineBookingOverdueBlockDays: true, operationalSettings: { select: { portalConsumptionEnabled: true } }, courts: { where: { active: true }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } }), getPublicPlayerAuth(arenaSlug)]);
  if (!arena) return null;
  const publicArena = { name: arena.name, logoUrl: arena.logoUrl, checkinEnabled: arena.checkinEnabled, onlineBookingEnabled: arena.onlineBookingEnabled, onlineBookingLayout: arena.onlineBookingLayout, onlineBookingPaymentEnabled: arena.onlineBookingPaymentEnabled, operationalSettings: arena.operationalSettings };
  if (!currentClient) return publicBookingViewSchema.parse({ selectedDate: dateValue(selectedDate), today: dateValue(today), arena: publicArena, currentClient: null, matchSummary: null, delinquency: { blocked: false, requiresReview: false, reviewReference: null }, courts: [], bookingServices: [], pendingReservation: null });
  const bookingMatch = matchId && currentClient ? await db.categoryMatch.findFirst({ where: { id: matchId, competition: { status: "PUBLISHED", category: { tournament: { arenaId: arena.id } } }, OR: [{ homePair: { players: { some: { playerId: currentClient.playerId } } } }, { awayPair: { players: { some: { playerId: currentClient.playerId } } } }] }, select: { homePair: { select: { name: true, players: { select: { player: { select: { name: true } } } } } }, awayPair: { select: { name: true, players: { select: { player: { select: { name: true } } } } } } } }) : null;
  const matchSummary = bookingMatch?.homePair && bookingMatch.awayPair ? { title: `${bookingMatch.homePair.name} × ${bookingMatch.awayPair.name}`, athletes: [...bookingMatch.homePair.players, ...bookingMatch.awayPair.players].map(item => item.player.name) } : undefined;

  const [occurrences, pendingReservations, delinquency] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.scheduleOccurrence.findMany({ where: { arenaId: arena.id, ...activeCourtOccurrenceWhere(), startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, select: { startsAt: true, endsAt: true, occurrenceCourts: { select: { courtId: true } } }, orderBy: { startsAt: "asc" } }),
    currentClient ? tx.scheduleOccurrence.findMany({ where: pendingPlayerOnlineBookingWhere(arena.id, currentClient.playerId, today), select: { id: true, status: true, startsAt: true, endsAt: true, occurrenceCourts: { select: { courtId: true } } }, orderBy: { createdAt: "desc" }, take: 1 }) : Promise.resolve([]),
    currentClient ? getBookingDelinquency(tx, arena.id, currentClient.playerId, arena.onlineBookingOverdueBlockDays, today) : Promise.resolve<BookingDelinquency>({ blocked: false, count: 0, outstandingCents: 0 }),
  ]));
  const offeredServices = currentClient && arena.onlineBookingEnabled ? await db.product.findMany({ where: { arenaId: arena.id, active: true, isService: true, showOnPortalBooking: true }, select: { id: true, name: true, priceCents: true, serviceHourly: true, bookingConcurrentLimit: true, bookingRules: true, serviceReservations: { where: { occurrence: { ...activeCourtOccurrenceWhere(), startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } } }, select: { occurrence: { select: { startsAt: true, endsAt: true } } } } }, orderBy: { name: "asc" } }) : [];
  const bookingServices = offeredServices.map(service => ({ id: service.id, conditions: serviceRuleDetails(readServiceBookingRules(service.bookingRules), arena.courts), rules: readServiceBookingRules(service.bookingRules), name: service.name, priceCents: service.priceCents, serviceHourly: service.serviceHourly, limit: service.bookingConcurrentLimit, busy: service.serviceReservations.map(({ occurrence }) => ({ start: Math.max(0, (occurrence.startsAt.getTime() - selectedDate.getTime()) / 60_000), end: Math.min(1440, (occurrence.endsAt.getTime() - selectedDate.getTime()) / 60_000) })) }));
  const weekday = selectedDate.getDay();
  const courts = arena.courts.map((storedCourt) => {
    const court={...storedCourt,weeklyRules:courtRulesForDate(storedCourt.weeklyRules,storedCourt.dateAvailability,selectedDate,true)};
    const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / court.onlineSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * court.onlineSlotMinutes).flatMap((minute) => {
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.available && item.startsAtMinute <= minute && item.endsAtMinute > minute);
      const occupied = occurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && item.startsAt.getHours() * 60 + item.startsAt.getMinutes() <= minute && item.endsAt.getHours() * 60 + item.endsAt.getMinutes() > minute);
      const startsAt = new Date(selectedDate); startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const tooSoon = arenaWallClockToInstant(startsAt).getTime() < Date.now() + arena.onlineBookingLeadTimeMinutes * 60_000;
      if (!rule || occupied || tooSoon) return [];
      const serviceDurations = bookingServices.flatMap(service => service.rules.minimumMinutes ? Array.from({ length: Math.floor(Math.max(...court.onlineDurationMinutes) / court.onlineSlotMinutes) }, (_, index) => (index + 1) * court.onlineSlotMinutes).filter(duration => servicePermitsInterval(service.rules, court.id, weekday, minute, duration) && peakServiceOccupancy(service.busy, minute, minute + duration) < service.limit) : []);
      const candidates = [...new Set([...court.onlineDurationMinutes, ...serviceDurations])].sort((a,b) => a-b);
      const occupiedIntervals = occurrences.filter(occurrence => occurrence.occurrenceCourts.some(entry => entry.courtId === court.id)).map(occurrence => ({ start:(occurrence.startsAt.getTime()-selectedDate.getTime())/60_000, end:(occurrence.endsAt.getTime()-selectedDate.getTime())/60_000 }));
      const blockedMinutes = Array.from({length:Math.ceil((Math.max(...candidates)||0)/court.onlineSlotMinutes)},(_,index)=>minute+index*court.onlineSlotMinutes).filter(start => occupiedIntervals.some(interval => start < interval.end && start+court.onlineSlotMinutes > interval.start));
      const durations = candidates.filter(duration => calculateCourtIntervalPrice({startsAtMinute:minute,durationMinutes:duration,intervalMinutes:court.onlineSlotMinutes,weekday,rules:court.weeklyRules}) !== null && !blockedMinutes.some(blocked => blocked < minute+duration));
      const minimumDuration = durations[0];
      const durationPrices = Object.fromEntries(durations.map(duration => [duration,calculateCourtIntervalPrice({startsAtMinute:minute,durationMinutes:duration,intervalMinutes:court.onlineSlotMinutes,weekday,rules:court.weeklyRules}) ?? 0]));
      const availableMinutes = Array.from({length:Math.ceil((Math.max(...durations)||0)/court.onlineSlotMinutes)},(_,index)=>minute+index*court.onlineSlotMinutes);
      return durations.length ? [{startsAt:`${dateValue(selectedDate)}T${minuteLabel(minute)}`,label:minuteLabel(minute),priceCents:durationPrices[minimumDuration],durationPrices,durations,standardDurations:court.onlineDurationMinutes,availableMinutes,blockedMinutes}] : [];
    });
    return { id: court.id, name: court.name, color: court.color, slotMinutes: court.onlineSlotMinutes, slots };
  }).filter((court) => court.slots.length);
  const pendingReservation = pendingReservations[0] ? (() => { const occurrence = pendingReservations[0]; const court = arena.courts.find((item) => occurrence.occurrenceCourts.some((entry) => entry.courtId === item.id)); const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(occurrence.startsAt).replace(".", ""); const start = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(occurrence.startsAt); const end = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(occurrence.endsAt); return { id: occurrence.id, status: occurrence.status as "PENDING_PAYMENT" | "PENDING_CONFIRMATION", label: `${date} - ${start} às ${end} · ${court?.name ?? "Quadra"}` }; })() : null;

  return publicBookingViewSchema.parse({ selectedDate: dateValue(selectedDate), today: dateValue(today), arena: publicArena, currentClient: { name: currentClient.name }, matchSummary: matchSummary ?? null, delinquency: { blocked: delinquency.blocked, requiresReview: Boolean(delinquency.requiresReview), reviewReference: delinquency.reviewReference ?? null }, courts, bookingServices, pendingReservation });
}
