import { notFound } from "next/navigation";
import { PublicCourtBookingForm } from "@/components/public-court-booking-form";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PublicBookingPageProps = { params: { arenaSlug: string }; searchParams?: { data?: string } };

function parseDate(value?: string) { if (!value) return new Date(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function dateValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

export default async function PublicBookingPage({ params, searchParams }: PublicBookingPageProps) {
  const selectedDate = startOfDay(parseDate(searchParams?.data));
  const nextDay = new Date(selectedDate); nextDay.setDate(nextDay.getDate() + 1);
  const [arena, currentClient] = await Promise.all([prisma.arena.findUnique({ where: { slug: params.arenaSlug }, select: { name: true, logoUrl: true, scheduleStartMinute: true, scheduleEndMinute: true, onlineBookingLayout: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, courts: { where: { active: true, weeklyRules: { some: { available: true } } }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } }), getPublicPlayerAuth(params.arenaSlug)]);
  if (!arena) notFound();
  const occurrences = await prisma.scheduleOccurrence.findMany({ where: { arena: { slug: params.arenaSlug }, status: { not: "CANCELED" }, startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true }, orderBy: { startsAt: "asc" } });
  const weekday = selectedDate.getDay();
  const courts = arena.courts.map((court) => {
    const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / court.onlineSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * court.onlineSlotMinutes).flatMap((minute) => {
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.available && item.startsAtMinute <= minute && item.endsAtMinute > minute);
      const occupied = occurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && item.startsAt.getHours() * 60 + item.startsAt.getMinutes() <= minute && item.endsAt.getHours() * 60 + item.endsAt.getMinutes() > minute);
      const startsAt = new Date(selectedDate); startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const tooSoon = startsAt.getTime() < Date.now() + arena.onlineBookingLeadTimeMinutes * 60_000;
      if (!rule || occupied || tooSoon) return [];
      const durations = court.onlineDurationMinutes.filter((item) => minute + item <= rule.endsAtMinute && !occurrences.some((occurrence) => occurrence.occurrenceCourts.some((entry) => entry.courtId === court.id) && occurrence.startsAt.getHours() * 60 + occurrence.startsAt.getMinutes() < minute + item && occurrence.endsAt.getHours() * 60 + occurrence.endsAt.getMinutes() > minute));
      return durations.length === court.onlineDurationMinutes.length ? [{ startsAt: `${dateValue(selectedDate)}T${minuteLabel(minute)}`, label: minuteLabel(minute), priceCents: rule.priceCents, durations }] : [];
    });
    return { id: court.id, name: court.name, color: court.color, slotMinutes: court.onlineSlotMinutes, slots };
  }).filter((court) => court.slots.length);
  const reservedSlots = arena.onlineBookingShowReserved ? occurrences.flatMap((occurrence) => occurrence.occurrenceCourts.map((entry) => {
    const court = arena.courts.find((item) => item.id === entry.courtId);
    return court ? `${court.name}: ${minuteLabel(occurrence.startsAt.getHours() * 60 + occurrence.startsAt.getMinutes())}` : "";
  })).filter(Boolean) : [];

  return <main className="public-booking-page"><section className="public-booking-shell"><header><img src={arena.logoUrl} alt="" /><div><span>RESERVA ONLINE</span><h1>{arena.name}</h1><p>Escolha a quadra, horário e duração da sua reserva.</p></div></header>{currentClient ? <><form className="public-booking-date" method="get"><label>Data<input type="date" name="data" defaultValue={dateValue(selectedDate)} /></label><button className="button" type="submit">Ver horários</button></form>{arena.onlineBookingShowReserved && occurrences.length ? <p className="public-booking-reserved">Os horários reservados estão sinalizados abaixo.</p> : null}<h2>Reserva online</h2><PublicCourtBookingForm arenaSlug={params.arenaSlug} courts={courts} currentClient={currentClient} layout={arena.onlineBookingLayout} paymentOnlineEnabled={arena.onlineBookingPaymentEnabled} reservedSlots={reservedSlots} /></> : <PublicClientAuthForm arenaSlug={params.arenaSlug} />}</section></main>;
}
