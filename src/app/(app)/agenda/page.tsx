import Link from "next/link";
import type { CSSProperties } from "react";
import { AgendaMonthPicker } from "@/components/agenda-month-picker";
import { AgendaSlotDialog } from "@/components/agenda-slot-dialog";
import { OnlineBookingSettingsDialog } from "@/components/online-booking-settings-dialog";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";

export const dynamic = "force-dynamic";

type AgendaPageProps = { searchParams?: { data?: string } };

function parseDate(value?: string) { if (!value) return new Date(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function startOfDay(value: Date) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function addDays(value: Date, amount: number) { const next = new Date(value); next.setDate(next.getDate() + amount); return next; }
function dateInputValue(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function minuteOfDay(value: Date) { return value.getHours() * 60 + value.getMinutes(); }
function bookingTypeIcon(value: string) {
  const type = value.trim().toLowerCase();
  if (type.includes("liga")) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5.5v1.25A3.25 3.25 0 0 0 8.75 10.5M16 6h2.5v1.25a3.25 3.25 0 0 1-3.25 3.25M12 12.5V17m-3.5 3h7" /></svg>;
  if (type.includes("aula")) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="2.5" /><path d="M6.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6M5 12l7-4 7 4" /></svg>;
  if (type.includes("super 12")) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="2.25" /><circle cx="16" cy="8" r="2.25" /><path d="M3.75 19c.45-3.2 2-4.8 4.25-4.8S11.8 15.8 12.25 19M11.75 19c.45-3.2 2-4.8 4.25-4.8s3.8 1.6 4.25 4.8" /></svg>;
  if (type.includes("fixa")) return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M7 11h10m-7 3h4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4m8-4v4M7 11h10m-6 3h4m-4 3h3" /></svg>;
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const auth = await requireModuleView("calendar");
  const selectedDate = startOfDay(parseDate(searchParams?.data));
  const nextDay = addDays(selectedDate, 1);
  const [arena, courts, scheduleOccurrences, players, teachers, storedBookingTypes] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true, scheduleStartMinute: true, scheduleEndMinute: true, scheduleSlotMinutes: true, onlineBookingLayout: true, onlineBookingRequiresConfirmation: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true, onlineBookingWhatsappMessage: true } }),
    tx.court.findMany({ where: { arenaId: auth.arenaId, active: true, weeklyRules: { some: {} } }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    tx.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, status: { not: "CANCELED" }, startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true, participants: true }, orderBy: { startsAt: "asc" } }),
    tx.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    tx.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    tx.bookingType.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } })
  ]));
  const bookingTypes = Array.from(new Set(["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva", ...storedBookingTypes.map((item) => item.name)]));
  const courtOptions = courts.map((court) => ({ id: court.id, name: court.name }));
  const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / arena.scheduleSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * arena.scheduleSlotMinutes);
  const days = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 3));
  const weekday = selectedDate.getDay();
  const dayHref = (date: Date) => `/agenda?data=${dateInputValue(date)}`;
  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(selectedDate);

  return <div className="agenda-page" aria-label="Agenda de quadras">
    <div className="agenda-date-strip">
      <Link href={dayHref(addDays(selectedDate, -1))} className="agenda-date-arrow" aria-label="Dia anterior">‹</Link>
      <div className="agenda-date-list">{days.map((date) => { const selected = date.getTime() === selectedDate.getTime(); return <Link key={dateInputValue(date)} href={dayHref(date)} className={selected ? "agenda-date-item agenda-date-item-active agenda-date-item-centered" : "agenda-date-item"}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "")}</span><strong>{date.getDate()}</strong></Link>; })}</div>
      <Link href={dayHref(addDays(selectedDate, 1))} className="agenda-date-arrow" aria-label="Próximo dia">›</Link>
      <Link href={dayHref(startOfDay(new Date()))} className="agenda-today-link">Hoje</Link>
      <div className="agenda-calendar-controls"><AgendaMonthPicker selectedDate={dateInputValue(selectedDate)} /><OnlineBookingSettingsDialog settings={{ arenaSlug: arena.slug, layout: arena.onlineBookingLayout, requiresConfirmation: arena.onlineBookingRequiresConfirmation, showReserved: arena.onlineBookingShowReserved, paymentOnlineEnabled: arena.onlineBookingPaymentEnabled, leadTimeMinutes: arena.onlineBookingLeadTimeMinutes, whatsappMessage: arena.onlineBookingWhatsappMessage }} /></div>
    </div>
    <div className="agenda-grid-caption"><strong>{selectedDateLabel}</strong><span>Preço e disponibilidade por quadra</span></div>
    {courts.length ? <div className="daily-court-grid-scroll"><table className="daily-court-grid"><thead><tr><th scope="col">Hora</th>{courts.map((court) => <th scope="col" className="daily-court-heading" style={{ "--court-color": court.color } as CSSProperties} key={court.id}>{court.name}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot}><th scope="row">{minuteLabel(slot)}</th>{courts.map((court) => {
      const occurrence = scheduleOccurrences.find((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) === slot);
      const isOccupied = scheduleOccurrences.some((item) => item.occurrenceCourts.some((entry) => entry.courtId === court.id) && minuteOfDay(item.startsAt) < slot && minuteOfDay(item.endsAt) > slot);
      if (isOccupied) return null;
      if (occurrence) { const rows = Math.max(1, Math.ceil((minuteOfDay(occurrence.endsAt) - minuteOfDay(occurrence.startsAt)) / arena.scheduleSlotMinutes)); const onlineBooking = occurrence.sourceType === "ONLINE_BOOKING"; const pendingOnlineConfirmation = onlineBooking && occurrence.status === "PENDING_CONFIRMATION"; return <td className={onlineBooking ? "daily-court-event daily-court-event-online" : "daily-court-event"} key={court.id} rowSpan={rows}><div className="agenda-event-content"><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} slot={{ occurrenceId: occurrence.id, courtId: court.id, courtIds: occurrence.occurrenceCourts.map((entry) => entry.courtId), courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(minuteOfDay(occurrence.startsAt)), endsAt: minuteLabel(minuteOfDay(occurrence.endsAt)), state: "OCCUPIED", pendingConfirmation: pendingOnlineConfirmation, bookingTypeName: occurrence.bookingTypeName, notes: occurrence.notes, teacherId: occurrence.teacherId ?? undefined, participants: occurrence.participants.map((participant) => ({ playerId: participant.playerId, amountCents: participant.amountCents, paymentMethod: participant.paymentMethod })) }}><span className="agenda-booking-type-icon" title={occurrence.bookingTypeName}>{bookingTypeIcon(occurrence.bookingTypeName)}</span><strong>{occurrence.title}{pendingOnlineConfirmation ? <span className="agenda-pending-confirmation"><i aria-hidden="true">◷</i>Aguardando confirmação</span> : null}{occurrence.participants.some((participant) => participant.paymentMethod) ? <span className="agenda-payment-indicator" title="Pagamento confirmado">$</span> : null}</strong><span className="agenda-booking-type-label">{occurrence.bookingTypeName}</span></AgendaSlotDialog></div></td>; }
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.startsAtMinute <= slot && item.endsAtMinute > slot);
      if (!rule || !rule.available) return <td className="daily-court-unavailable" key={court.id}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} slot={{ courtId: court.id, courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(slot), endsAt: minuteLabel(slot + arena.scheduleSlotMinutes), state: "UNAVAILABLE" }}><span>Indisponível</span></AgendaSlotDialog></td>;
      return <td className="daily-court-available" key={court.id}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} slot={{ courtId: court.id, courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(slot), endsAt: minuteLabel(slot + arena.scheduleSlotMinutes), state: "AVAILABLE", priceCents: rule.priceCents }}><span>Livre</span></AgendaSlotDialog></td>;
    })}</tr>)}</tbody></table></div> : <div className="agenda-empty"><h2>Nenhuma quadra configurada</h2><p>Cadastre e programe as quadras pelo menu Configurações.</p></div>}
  </div>;
}
