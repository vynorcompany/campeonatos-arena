import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-booking-content.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicCourtBookingForm } from "@/components/public-court-booking-form";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";
import { activeCourtOccurrenceWhere, pendingPlayerOnlineBookingWhere } from "@/lib/calendar/online-booking-hold";
import { arenaToday, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { getBookingDelinquency } from "@/lib/calendar/booking-delinquency";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

type PublicBookingContentProps = { arenaSlug: string; date?: string; embedded?: boolean };

function parseDate(value?: string) { if (!value) return arenaToday(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? arenaToday() : parsed; }
function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function dateValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

export async function PublicBookingContent({ arenaSlug, date, embedded = false }: PublicBookingContentProps) {
  const selectedDate = startOfDay(parseDate(date));
  const mobileStart = new Date(selectedDate);
  mobileStart.setDate(mobileStart.getDate() - 2);
  const today = arenaToday();
  if (mobileStart < today) mobileStart.setTime(today.getTime());
  const mobileDates = Array.from({ length: 7 }, (_, index) => { const value = new Date(mobileStart); value.setDate(value.getDate() + index); return value; });
  const nextDay = new Date(selectedDate); nextDay.setDate(nextDay.getDate() + 1);
  const [arena, currentClient] = await Promise.all([prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true, name: true, logoUrl: true, scheduleStartMinute: true, scheduleEndMinute: true, onlineBookingEnabled: true, onlineBookingLayout: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, onlineBookingOverdueBlockDays: true, courts: { where: { active: true, weeklyRules: { some: { available: true } } }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } } }), getPublicPlayerAuth(arenaSlug)]);
  if (!arena) notFound();
  const [occurrences, pendingReservations, delinquency] = await withArenaTransaction(arena.id, (tx) => Promise.all([
    tx.scheduleOccurrence.findMany({ where: { arenaId: arena.id, ...activeCourtOccurrenceWhere(), startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true }, orderBy: { startsAt: "asc" } }),
    currentClient ? tx.scheduleOccurrence.findMany({ where: pendingPlayerOnlineBookingWhere(arena.id, currentClient.playerId, today), include: { occurrenceCourts: true }, orderBy: { createdAt: "desc" }, take: 1 }) : Promise.resolve([]),
    currentClient ? getBookingDelinquency(tx, arena.id, currentClient.playerId, arena.onlineBookingOverdueBlockDays, today) : Promise.resolve({ blocked: false, count: 0, outstandingCents: 0 }),
  ]));
  const weekday = selectedDate.getDay();
  const courts = arena.courts.map((court) => {
    const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / court.onlineSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * court.onlineSlotMinutes).flatMap((minute) => {
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.available && item.startsAtMinute <= minute && item.endsAtMinute > minute);
      const occupied = occurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && item.startsAt.getHours() * 60 + item.startsAt.getMinutes() <= minute && item.endsAt.getHours() * 60 + item.endsAt.getMinutes() > minute);
      const startsAt = new Date(selectedDate); startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const tooSoon = arenaWallClockToInstant(startsAt).getTime() < Date.now() + arena.onlineBookingLeadTimeMinutes * 60_000;
      if (!rule || occupied || tooSoon) return [];
      const durations = court.onlineDurationMinutes.filter((item) => calculateCourtIntervalPrice({ startsAtMinute: minute, durationMinutes: item, intervalMinutes: court.onlineSlotMinutes, weekday, rules: court.weeklyRules }) !== null);
      const minimumDuration = durations[0];
      const durationPrices = Object.fromEntries(durations.map((duration) => [duration, calculateCourtIntervalPrice({ startsAtMinute: minute, durationMinutes: duration, intervalMinutes: court.onlineSlotMinutes, weekday, rules: court.weeklyRules }) ?? 0]));
      const blockedMinutes = Array.from({ length: Math.ceil((Math.max(...durations) || 0) / court.onlineSlotMinutes) }, (_, index) => minute + index * court.onlineSlotMinutes).filter((slotMinute) => occurrences.some((occurrence) => occurrence.occurrenceCourts.some((entry) => entry.courtId === court.id) && occurrence.startsAt.getHours() * 60 + occurrence.startsAt.getMinutes() <= slotMinute && occurrence.endsAt.getHours() * 60 + occurrence.endsAt.getMinutes() > slotMinute));
      const minimumBlocked = !minimumDuration || blockedMinutes.some((slotMinute) => slotMinute < minute + minimumDuration);
      const availableMinutes = Array.from({ length: Math.ceil((Math.max(...durations) || 0) / court.onlineSlotMinutes) }, (_, index) => minute + index * court.onlineSlotMinutes);
      return !minimumBlocked && durations.length ? [{ startsAt: `${dateValue(selectedDate)}T${minuteLabel(minute)}`, label: minuteLabel(minute), priceCents: durationPrices[minimumDuration], durationPrices, durations, availableMinutes, blockedMinutes }] : [];
    });
    return { id: court.id, name: court.name, color: court.color, slotMinutes: court.onlineSlotMinutes, slots };
  }).filter((court) => court.slots.length);
  const reservedSlots = arena.onlineBookingShowReserved ? occurrences.flatMap((occurrence) => occurrence.occurrenceCourts.map((entry) => {
    const court = arena.courts.find((item) => item.id === entry.courtId);
    return court ? `${court.name}: ${minuteLabel(occurrence.startsAt.getHours() * 60 + occurrence.startsAt.getMinutes())}` : "";
  })).filter(Boolean) : [];
  const pendingReservation = pendingReservations[0] ? (() => { const occurrence = pendingReservations[0]; const court = arena.courts.find((item) => occurrence.occurrenceCourts.some((entry) => entry.courtId === item.id)); const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(occurrence.startsAt).replace(".", ""); const start = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(occurrence.startsAt); const end = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(occurrence.endsAt); return { id: occurrence.id, status: occurrence.status as "PENDING_PAYMENT" | "PENDING_CONFIRMATION", label: `${date} - ${start} às ${end} · ${court?.name ?? "Quadra"}` }; })() : null;

  const content = <section className={cx(`${viewStyles.public_booking_shell}${embedded ? " " + viewStyles.public_booking_shell_embedded : ""}`, embedded ? "tw:viewport-700:border-0! tw:viewport-700:bg-transparent! tw:viewport-700:[background-image:none]! tw:viewport-700:shadow-none! tw:viewport-700:p-0! tw:viewport-700:text-[#133047]! tw:viewport-700:dark:text-[#eafff3]! tw:viewport-700:[&_>_header]:hidden! tw:viewport-700:[&_>_h2]:hidden!" : "")}><header><img src={arena.logoUrl} alt="" /><div><span>RESERVA ONLINE</span><h1>{arena.name}</h1><p>{arena.onlineBookingEnabled ? "Escolha a quadra, horário e duração da sua reserva." : "A reserva online não está disponível neste momento."}</p></div></header>{arena.onlineBookingEnabled ? (currentClient ? <><div className="tw:hidden tw:viewport-700:block"><h2 className="tw:mt-1 tw:mb-3 tw:text-[1.4rem] tw:font-semibold tw:text-[#133047]! tw:dark:text-[#eafff3]!">Reservar quadra</h2><div className="tw:mb-2 tw:flex tw:items-center tw:justify-between"><strong className="tw:text-sm">{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(selectedDate)}</strong><span className="tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">Escolha uma data</span></div><nav className="tw:grid tw:grid-cols-7 tw:gap-1" aria-label="Dias próximos">{mobileDates.map((day) => <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=booking&data=${dateValue(day)}`} key={dateValue(day)} aria-current={dateValue(day) === dateValue(selectedDate) ? "date" : undefined} className={cx("tw:grid tw:min-h-12 tw:place-content-center tw:rounded-xl tw:text-center tw:text-xs tw:no-underline", dateValue(day) === dateValue(selectedDate) ? "tw:bg-[#078f7c] tw:text-white tw:dark:bg-[#5bdec1] tw:dark:text-[#082b34]" : "tw:text-[#607e8d] tw:dark:text-[#a4c8b9]")}><span className="tw:text-[.6rem] tw:uppercase">{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "")}</span><strong className="tw:text-sm">{day.getDate()}</strong></Link>)}</nav></div><form className={cx(viewStyles.public_booking_date, "tw:viewport-700:mt-2! tw:viewport-700:mb-4! tw:viewport-700:items-end! tw:viewport-700:flex-row! tw:viewport-700:[&_label]:flex-1! tw:viewport-700:[&_label]:text-[#607e8d]! tw:viewport-700:dark:[&_label]:text-[#a4c8b9]!")} method="get" action={embedded ? `/classificacao/${arenaSlug}` : undefined}>{embedded ? <input type="hidden" name="section" value="booking" /> : null}<label>Outra data<input type="date" name="data" defaultValue={dateValue(selectedDate)} /></label><button className={viewStyles.button} type="submit">Ver horários</button></form>{arena.onlineBookingShowReserved && occurrences.length ? <p className={viewStyles.public_booking_reserved}>Os horários reservados estão sinalizados abaixo.</p> : null}<h2>Reserva online</h2>{delinquency.blocked ? <p role="alert" className="tw:rounded-xl tw:border tw:border-amber-400 tw:bg-amber-50 tw:p-3 tw:text-sm tw:text-amber-950! tw:dark:border-amber-700 tw:dark:bg-amber-950 tw:dark:text-amber-100!">Novas reservas bloqueadas por pagamentos em atraso. <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}&section=finance`} className="tw:font-semibold tw:text-amber-950! tw:underline tw:dark:text-amber-100!">Ver pendências financeiras</Link>.</p> : null}<PublicCourtBookingForm key={dateValue(selectedDate)} arenaSlug={arenaSlug} courts={courts} currentClient={currentClient} layout={arena.onlineBookingLayout} paymentOnlineEnabled={arena.onlineBookingPaymentEnabled} reservedSlots={reservedSlots} pendingReservation={pendingReservation} bookingBlocked={delinquency.blocked} embedded={embedded} /></> : <PublicClientAuthForm arenaSlug={arenaSlug} />) : <section className={viewStyles.public_booking_disabled}><span>RESERVA ONLINE</span><h2>Reserva Online Desabilitada</h2><p>Esta arena desativou temporariamente os agendamentos pelo portal. Entre em contato com a arena para mais informações.</p></section>}</section>;
  return embedded ? <section className={cx(viewStyles.athlete_portal_booking, "tw:viewport-700:mx-4! tw:viewport-700:mt-2! tw:viewport-700:w-[calc(100%_-_32px)]! tw:viewport-700:pb-28!")}>{content}</section> : <main className={viewStyles.public_booking_page}>{content}</main>;
}
