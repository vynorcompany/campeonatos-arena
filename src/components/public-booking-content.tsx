import { notFound } from "next/navigation";
import { PublicCourtBookingForm } from "@/components/public-court-booking-form";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

type PublicBookingContentProps = { arenaSlug: string; date?: string; embedded?: boolean };

function parseDate(value?: string) { if (!value) return new Date(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function dateValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

export async function PublicBookingContent({ arenaSlug, date, embedded = false }: PublicBookingContentProps) {
  const selectedDate = startOfDay(parseDate(date));
  const nextDay = new Date(selectedDate); nextDay.setDate(nextDay.getDate() + 1);
  const [arena, currentClient] = await Promise.all([prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true, name: true, logoUrl: true, scheduleStartMinute: true, scheduleEndMinute: true, onlineBookingLayout: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, courts: { where: { active: true, weeklyRules: { some: { available: true } } }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } }), getPublicPlayerAuth(arenaSlug)]);
  if (!arena) notFound();
  const [occurrences, pendingReservations] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.scheduleOccurrence.findMany({ where: { arenaId: arena.id, status: { not: "CANCELED" }, startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true }, orderBy: { startsAt: "asc" } }),
    currentClient ? tx.scheduleOccurrence.findMany({ where: { arenaId: arena.id, sourceType: "ONLINE_BOOKING", status: "PENDING_CONFIRMATION", participants: { some: { playerId: currentClient.playerId } }, endsAt: { gte: selectedDate } }, include: { occurrenceCourts: true }, orderBy: { startsAt: "asc" }, take: 5 }) : Promise.resolve([]),
  ]));
  const weekday = selectedDate.getDay();
  const courts = arena.courts.map((court) => {
    const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / court.onlineSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * court.onlineSlotMinutes).flatMap((minute) => {
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.available && item.startsAtMinute <= minute && item.endsAtMinute > minute);
      const occupied = occurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && item.startsAt.getHours() * 60 + item.startsAt.getMinutes() <= minute && item.endsAt.getHours() * 60 + item.endsAt.getMinutes() > minute);
      const startsAt = new Date(selectedDate); startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const tooSoon = startsAt.getTime() < Date.now() + arena.onlineBookingLeadTimeMinutes * 60_000;
      if (!rule || occupied || tooSoon) return [];
      const durations = court.onlineDurationMinutes.filter((item) => calculateCourtIntervalPrice({ startsAtMinute: minute, durationMinutes: item, intervalMinutes: court.onlineSlotMinutes, weekday, rules: court.weeklyRules }) !== null);
      const minimumDuration = durations[0];
      const blockedMinutes = Array.from({ length: Math.ceil((Math.max(...durations) || 0) / court.onlineSlotMinutes) }, (_, index) => minute + index * court.onlineSlotMinutes).filter((slotMinute) => occurrences.some((occurrence) => occurrence.occurrenceCourts.some((entry) => entry.courtId === court.id) && occurrence.startsAt.getHours() * 60 + occurrence.startsAt.getMinutes() <= slotMinute && occurrence.endsAt.getHours() * 60 + occurrence.endsAt.getMinutes() > slotMinute));
      const minimumBlocked = !minimumDuration || blockedMinutes.some((slotMinute) => slotMinute < minute + minimumDuration);
      const availableMinutes = Array.from({ length: Math.ceil((Math.max(...durations) || 0) / court.onlineSlotMinutes) }, (_, index) => minute + index * court.onlineSlotMinutes);
      return !minimumBlocked && durations.length ? [{ startsAt: `${dateValue(selectedDate)}T${minuteLabel(minute)}`, label: minuteLabel(minute), priceCents: rule.priceCents, durations, availableMinutes, blockedMinutes }] : [];
    });
    return { id: court.id, name: court.name, color: court.color, slotMinutes: court.onlineSlotMinutes, slots };
  }).filter((court) => court.slots.length);
  const reservedSlots = arena.onlineBookingShowReserved ? occurrences.flatMap((occurrence) => occurrence.occurrenceCourts.map((entry) => {
    const court = arena.courts.find((item) => item.id === entry.courtId);
    return court ? `${court.name}: ${minuteLabel(occurrence.startsAt.getHours() * 60 + occurrence.startsAt.getMinutes())}` : "";
  })).filter(Boolean) : [];
  const pendingReservationLabels = pendingReservations.map((occurrence) => { const court = arena.courts.find((item) => occurrence.occurrenceCourts.some((entry) => entry.courtId === item.id)); return `${court?.name ?? "Quadra"} · ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(occurrence.startsAt)}`; });

  const content = <section className={`public-booking-shell${embedded ? " public-booking-shell-embedded" : ""}`}><header><img src={arena.logoUrl} alt="" /><div><span>RESERVA ONLINE</span><h1>{arena.name}</h1><p>Escolha a quadra, horário e duração da sua reserva.</p></div></header>{currentClient ? <><form className="public-booking-date" method="get" action={embedded ? `/classificacao/${arenaSlug}` : undefined}>{embedded ? <input type="hidden" name="section" value="booking" /> : null}<label>Data<input type="date" name="data" defaultValue={dateValue(selectedDate)} /></label><button className="button" type="submit">Ver horários</button></form>{arena.onlineBookingShowReserved && occurrences.length ? <p className="public-booking-reserved">Os horários reservados estão sinalizados abaixo.</p> : null}<h2>Reserva online</h2><PublicCourtBookingForm arenaSlug={arenaSlug} courts={courts} currentClient={currentClient} layout={arena.onlineBookingLayout} paymentOnlineEnabled={arena.onlineBookingPaymentEnabled} reservedSlots={reservedSlots} pendingReservations={pendingReservationLabels} /></> : <PublicClientAuthForm arenaSlug={arenaSlug} />}</section>;
  return embedded ? <section className="athlete-portal-booking">{content}</section> : <main className="public-booking-page">{content}</main>;
}
