import Link from "next/link";
import type { CSSProperties } from "react";
import { AgendaSlotDialog } from "@/components/agenda-slot-dialog";
import { OnlineBookingSettingsDialog } from "@/components/online-booking-settings-dialog";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AgendaPageProps = { searchParams?: { data?: string } };

function parseDate(value?: string) { if (!value) return new Date(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function dateInputValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function minuteOfDay(value: Date) { return value.getHours() * 60 + value.getMinutes(); }
function priceLabel(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const auth = await requireModuleView("calendar");
  const selectedDate = startOfDay(parseDate(searchParams?.data));
  const nextDay = addDays(selectedDate, 1);
  const [arena, courts, scheduleOccurrences, players, teachers, storedBookingTypes] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true, scheduleStartMinute: true, scheduleEndMinute: true, scheduleSlotMinutes: true, onlineBookingLayout: true, onlineBookingRequiresConfirmation: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, onlineBookingWhatsappMessage: true } }),
    prisma.court.findMany({ where: { arenaId: auth.arenaId, active: true, weeklyRules: { some: {} } }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, status: { not: "CANCELED" }, startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true, participants: true }, orderBy: { startsAt: "asc" } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.bookingType.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } })
  ]);
  const bookingTypes = Array.from(new Set(["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva", ...storedBookingTypes.map((item) => item.name)]));
  const courtOptions = courts.map((court) => ({ id: court.id, name: court.name }));
  const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / arena.scheduleSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * arena.scheduleSlotMinutes);
  const days = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 3));
  const weekday = selectedDate.getDay();
  const dayHref = (date: Date) => `/agenda?data=${dateInputValue(date)}`;
  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(selectedDate);

  return <div className="agenda-page" aria-label="Agenda de quadras">
    <div className="agenda-date-strip">
      <OnlineBookingSettingsDialog settings={{ arenaSlug: arena.slug, layout: arena.onlineBookingLayout, requiresConfirmation: arena.onlineBookingRequiresConfirmation, showReserved: arena.onlineBookingShowReserved, paymentOnlineEnabled: arena.onlineBookingPaymentEnabled, leadTimeMinutes: arena.onlineBookingLeadTimeMinutes, whatsappMessage: arena.onlineBookingWhatsappMessage }} />
      <Link href={dayHref(addDays(selectedDate, -1))} className="agenda-date-arrow" aria-label="Dia anterior">‹</Link>
      <div className="agenda-date-list">{days.map((date) => { const selected = date.getTime() === selectedDate.getTime(); return <Link key={dateInputValue(date)} href={dayHref(date)} className={selected ? "agenda-date-item agenda-date-item-active agenda-date-item-centered" : "agenda-date-item"}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "")}</span><strong>{date.getDate()}</strong></Link>; })}</div>
      <Link href={dayHref(addDays(selectedDate, 1))} className="agenda-date-arrow" aria-label="Próximo dia">›</Link>
      <Link href={dayHref(startOfDay(new Date()))} className="agenda-today-link">Hoje</Link>
      <Link href="/agenda/configuracao" className="agenda-settings-link">Configurar</Link>
    </div>
    <div className="agenda-grid-caption"><strong>{selectedDateLabel}</strong><span>Preço e disponibilidade por quadra</span></div>
    {courts.length ? <div className="daily-court-grid-scroll"><table className="daily-court-grid"><thead><tr><th scope="col">Hora</th>{courts.map((court) => <th scope="col" className="daily-court-heading" style={{ "--court-color": court.color } as CSSProperties} key={court.id}>{court.name}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot}><th scope="row">{minuteLabel(slot)}</th>{courts.map((court) => {
      const occurrence = scheduleOccurrences.find((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) === slot);
      const isOccupied = scheduleOccurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) < slot && minuteOfDay(item.endsAt) > slot);
      if (isOccupied) return null;
      if (occurrence) { const rows = Math.max(1, Math.ceil((minuteOfDay(occurrence.endsAt) - minuteOfDay(occurrence.startsAt)) / arena.scheduleSlotMinutes)); const onlineBooking = occurrence.sourceType === "ONLINE_BOOKING"; const pendingOnlineConfirmation = onlineBooking && occurrence.status === "PENDING_CONFIRMATION"; return <td className={onlineBooking ? "daily-court-event daily-court-event-online" : "daily-court-event"} key={court.id} rowSpan={rows}><div className="agenda-event-content">{pendingOnlineConfirmation ? <span className="agenda-pending-confirmation">Aguardando confirmação</span> : null}<AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} slot={{ occurrenceId: occurrence.id, courtId: court.id, courtIds: occurrence.occurrenceCourts.map((entry) => entry.courtId), courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(minuteOfDay(occurrence.startsAt)), endsAt: minuteLabel(minuteOfDay(occurrence.endsAt)), state: "OCCUPIED", pendingConfirmation: pendingOnlineConfirmation, bookingTypeName: occurrence.bookingTypeName, notes: occurrence.notes, teacherId: occurrence.teacherId ?? undefined, participants: occurrence.participants.map((participant) => ({ playerId: participant.playerId, amountCents: participant.amountCents, paymentMethod: participant.paymentMethod })) }}><strong>{occurrence.title}{occurrence.participants.some((participant) => participant.paymentMethod) ? <span className="agenda-payment-indicator" title="Pagamento confirmado">$</span> : null}</strong>{onlineBooking ? null : <span>{occurrence.sourceType}</span>}</AgendaSlotDialog></div></td>; }
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.startsAtMinute <= slot && item.endsAtMinute > slot);
      if (!rule || !rule.available) return <td className="daily-court-unavailable" key={court.id}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} slot={{ courtId: court.id, courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(slot), endsAt: minuteLabel(slot + arena.scheduleSlotMinutes), state: "UNAVAILABLE" }}><span>Indisponível</span></AgendaSlotDialog></td>;
      return <td className="daily-court-available" key={court.id}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} slot={{ courtId: court.id, courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(slot), endsAt: minuteLabel(slot + arena.scheduleSlotMinutes), state: "AVAILABLE", priceCents: rule.priceCents }}><strong>{priceLabel(rule.priceCents)}</strong><span>Livre</span></AgendaSlotDialog></td>;
    })}</tr>)}</tbody></table></div> : <div className="agenda-empty"><h2>Cadastre suas quadras para abrir a agenda</h2><p>Crie as quadras e as faixas semanais para visualizar os horários disponíveis.</p><Link className="button button-primary" href="/agenda/configuracao">Configurar agenda</Link></div>}
  </div>;
}
