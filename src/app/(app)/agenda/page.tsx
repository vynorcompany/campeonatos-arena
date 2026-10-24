import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import type { ComponentProps, CSSProperties } from "react";
import { AgendaMonthPicker } from "@/components/agenda-month-picker";
import { AgendaSlotDialog as BaseAgendaSlotDialog } from "@/components/agenda-slot-dialog";
import { OnlineBookingSettingsDialog } from "@/components/online-booking-settings-dialog";
import { requireModuleView } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { standardServicePrices, serviceBookingName } from "@/lib/calendar/standard-services";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
import { arenaToday } from "@/lib/calendar/arena-wall-clock";
import { isConfirmedSchedulePaymentMethod } from "@/lib/calendar/booking-payment-claim";
import { isAgendaManagedBooking } from "@/lib/calendar/agenda-managed-booking";
import { buildAgendaOccurrenceIndex } from "@/lib/calendar/agenda-occurrence-index";
import { canPerformPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type AgendaPageProps = { searchParams?: Promise<{ data?: string }> };

function parseDate(value?: string) { if (!value) return arenaToday(); const [year, month, day] = value.split("-").map(Number); const parsed = new Date(year, (month ?? 1) - 1, day ?? 1); return Number.isNaN(parsed.getTime()) ? arenaToday() : parsed; }
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

function bookingEventCopy(title: string, bookingTypeName: string) {
  const prefix = `${bookingTypeName} · `;
  if (title.startsWith(prefix)) return { primary: title.slice(prefix.length) || bookingTypeName, secondary: bookingTypeName };
  return { primary: title, secondary: bookingTypeName };
}

function bookingTypeClass(bookingTypeName: string) {
  const type = bookingTypeName.trim().toLowerCase();
  if (type === "aula fixa") return viewStyles.agenda_event_type_fixed_lesson;
  if (type === "aula") return viewStyles.agenda_event_type_lesson;
  if (type === "plano") return viewStyles.agenda_event_type_plan;
  if (type === "super 12") return viewStyles.agenda_event_type_super12;
  if (type === "liga") return viewStyles.agenda_event_type_league;
  return viewStyles.agenda_event_type_booking;
}

export default async function AgendaPage(props: AgendaPageProps) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("calendar");
  const selectedDate = startOfDay(parseDate(searchParams?.data));
  const nextDay = addDays(selectedDate, 1);
  const [arena, courts, scheduleOccurrences, players, teachers, storedBookingTypes, servicePrices, customServices] = await withArenaTransaction(auth.arenaId, (tx) => Promise.all([
    tx.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { slug: true, scheduleStartMinute: true, scheduleEndMinute: true, scheduleSlotMinutes: true, onlineBookingLayout: true, onlineBookingRequiresConfirmation: true, onlineBookingShowReserved: true, onlineBookingPaymentEnabled: true, onlineBookingEnabled: true, onlineBookingLeadTimeMinutes: true, onlineBookingOverdueBlockDays: true, onlineBookingWhatsappMessage: true, onlineBookingWhatsappConfirmationEnabled: true } }),
    tx.court.findMany({ where: { arenaId: auth.arenaId, active: true, weeklyRules: { some: {} } }, include: { weeklyRules: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    tx.scheduleOccurrence.findMany({ where: { arenaId: auth.arenaId, ...activeCourtOccurrenceWhere(), startsAt: { lt: nextDay }, endsAt: { gt: selectedDate } }, include: { occurrenceCourts: true, participants: true }, orderBy: { startsAt: "asc" } }),
    tx.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    tx.teacher.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    tx.bookingType.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    tx.arenaServicePrice.findMany({ where: { arenaId: auth.arenaId }, select: { serviceCode: true, priceCents: true } }),
    tx.product.findMany({ where: { arenaId: auth.arenaId, active: true, isService: true }, select: { name: true, sku: true, priceCents: true, showOnAgenda: true } })
  ]));
  const hiddenServices = new Set(customServices.filter(service => !service.showOnAgenda).map(serviceBookingName));
  const bookingTypes = Array.from(new Set(["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva", ...storedBookingTypes.map((item) => item.name), ...customServices.filter(service => service.showOnAgenda).map(serviceBookingName)])).filter(name => !hiddenServices.has(name));
  const servicePriceValues = { ...standardServicePrices(servicePrices), ...Object.fromEntries(customServices.map(service => [serviceBookingName(service), service.priceCents])) };
  const courtOptions = courts.map((court) => ({ id: court.id, name: court.name }));
  const slots = Array.from({ length: Math.max(0, Math.ceil((arena.scheduleEndMinute - arena.scheduleStartMinute) / arena.scheduleSlotMinutes)) }, (_, index) => arena.scheduleStartMinute + index * arena.scheduleSlotMinutes);
  const { byCourtAndSlot: occurrencesByCourtAndSlot, occupiedCourtSlots } = buildAgendaOccurrenceIndex(scheduleOccurrences, slots);
  const days = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index - 3));
  const weekday = selectedDate.getDay();
  const dayHref = (date: Date) => `/agenda?data=${dateInputValue(date)}`;
  const selectedDateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).format(selectedDate);
  const gridMinWidth = 64 + courts.length * 220;
  const canCreateBooking = canPerformPermission("calendar:booking:create", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canEditBooking = canPerformPermission("calendar:booking:edit", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canCancelBooking = canPerformPermission("calendar:booking:cancel", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canReleaseBooking = canPerformPermission("calendar:recurrence:release", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canOpenComandas = canPerformPermission("pos:command:create", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canCreatePlayer = canPerformPermission("players:create", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const canManageSchedule = canPerformPermission("calendar:settings:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const AgendaSlotDialog = (dialogProps: Omit<ComponentProps<typeof BaseAgendaSlotDialog>, "canCreateBooking" | "canEditBooking" | "canCancelBooking" | "canReleaseBooking" | "canOpenComandas" | "canCreatePlayer">) => {
    const managed = !dialogProps.slot.occurrenceId || isAgendaManagedBooking(dialogProps.slot.sourceType ?? "");
    return <BaseAgendaSlotDialog {...dialogProps} canCreateBooking={canCreateBooking} canEditBooking={managed && canEditBooking} canCancelBooking={managed && canCancelBooking} canReleaseBooking={managed && canReleaseBooking} canOpenComandas={canOpenComandas} canCreatePlayer={canCreatePlayer} />;
  };

  return <div className={viewStyles.agenda_page} aria-label="Agenda de quadras">
    <div className={viewStyles.agenda_date_strip}>
      <Link href={dayHref(addDays(selectedDate, -1))} className={viewStyles.agenda_date_arrow} aria-label="Dia anterior">‹</Link>
      <div className={viewStyles.agenda_date_list}>{days.map((date) => { const selected = date.getTime() === selectedDate.getTime(); return <Link key={dateInputValue(date)} href={dayHref(date)} className={cx(selected ? viewStyles.agenda_date_item_agenda_date_item_active_agenda_date_item_centered : viewStyles.agenda_date_item)}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "")}</span><strong>{date.getDate()}</strong></Link>; })}</div>
      <Link href={dayHref(addDays(selectedDate, 1))} className={viewStyles.agenda_date_arrow} aria-label="Próximo dia">›</Link>
      <Link href={dayHref(arenaToday())} className={viewStyles.agenda_today_link}>Hoje</Link>
      <div className={viewStyles.agenda_calendar_controls}><AgendaMonthPicker selectedDate={dateInputValue(selectedDate)} />{canManageSchedule ? <OnlineBookingSettingsDialog settings={{ arenaSlug: arena.slug, layout: arena.onlineBookingLayout, requiresConfirmation: arena.onlineBookingRequiresConfirmation, showReserved: arena.onlineBookingShowReserved, paymentOnlineEnabled: arena.onlineBookingPaymentEnabled, enabled: arena.onlineBookingEnabled, leadTimeMinutes: arena.onlineBookingLeadTimeMinutes, overdueBlockDays: arena.onlineBookingOverdueBlockDays, whatsappMessage: arena.onlineBookingWhatsappMessage, whatsappConfirmationEnabled: arena.onlineBookingWhatsappConfirmationEnabled }} /> : null}</div>
    </div>
    <div className={viewStyles.agenda_grid_caption}><strong>{selectedDateLabel}</strong><span>Preço e disponibilidade por quadra</span></div>
    {courts.length > 1 ? <p className="tw:hidden tw:viewport-700:block tw:m-0 tw:text-xs tw:text-[#617991]">Deslize a grade para ver as outras quadras. A coluna de horários permanece visível.</p> : null}
    {courts.length ? <div className={viewStyles.daily_court_grid_scroll} role="region" aria-label="Grade de horários por quadra" tabIndex={0}><table className={viewStyles.daily_court_grid} style={{ minWidth: gridMinWidth }}><thead><tr><th scope="col">Hora</th>{courts.map((court) => <th scope="col" className="daily-court-heading" style={{ "--court-color": court.color } as CSSProperties} key={court.id}>{court.name}</th>)}</tr></thead><tbody>{slots.map((slot) => <tr key={slot}><th scope="row">{minuteLabel(slot)}</th>{courts.map((court) => {
      const occurrence = occurrencesByCourtAndSlot.get(`${court.id}:${slot}`);
      const isOccupied = occupiedCourtSlots.has(`${court.id}:${slot}`);
      if (isOccupied) return null;
      if (occurrence) { const rows = Math.max(1, Math.ceil((minuteOfDay(occurrence.endsAt) - minuteOfDay(occurrence.startsAt)) / arena.scheduleSlotMinutes)); const onlineBooking = occurrence.sourceType === "ONLINE_BOOKING"; const pendingOnlineConfirmation = onlineBooking && occurrence.status === "PENDING_CONFIRMATION"; const pendingOnlinePayment = onlineBooking && occurrence.status === "PENDING_PAYMENT"; const eventCopy = bookingEventCopy(occurrence.title, occurrence.bookingTypeName); return <td className={cx(`${onlineBooking ? viewStyles.daily_court_event_daily_court_event_online : viewStyles.daily_court_event} ${bookingTypeClass(occurrence.bookingTypeName)}`)} key={court.id} rowSpan={rows}><div className={viewStyles.agenda_event_content}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} servicePrices={servicePriceValues} slot={{ occurrenceId: occurrence.id, sourceType: occurrence.sourceType, courtId: court.id, courtIds: occurrence.occurrenceCourts.map((entry) => entry.courtId), courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(minuteOfDay(occurrence.startsAt)), endsAt: minuteLabel(minuteOfDay(occurrence.endsAt)), state: "OCCUPIED", pendingConfirmation: pendingOnlineConfirmation, pricingRules: court.weeklyRules, bookingTypeName: occurrence.bookingTypeName, notes: occurrence.notes, teacherId: occurrence.teacherId ?? undefined, responsiblePlayerId: occurrence.responsiblePlayerId ?? undefined, participants: occurrence.participants.map((participant) => ({ playerId: participant.playerId, checkedInAt: participant.checkedInAt?.toISOString() ?? null, amountCents: participant.amountCents, paymentMethod: isConfirmedSchedulePaymentMethod(participant.paymentMethod) ? participant.paymentMethod : "" })) }}><div className={viewStyles.agenda_booking_event_card}><span className={viewStyles.agenda_booking_type_icon} title={occurrence.bookingTypeName}>{bookingTypeIcon(occurrence.bookingTypeName)}</span><div><strong>{eventCopy.primary}</strong><span className={viewStyles.agenda_booking_type_label}>{eventCopy.secondary}</span>{occurrence.participants.some(participant => participant.checkedInAt) ? <span className="tw:block tw:text-xs tw:font-semibold tw:text-[#078f7c]">✓ {occurrence.participants.filter(participant => participant.checkedInAt).length} check-in(s)</span> : null}{!occurrence.responsiblePlayerId && !occurrence.teacherId ? <span className="tw:block tw:text-xs tw:text-amber-700">Sem responsável</span> : null}{pendingOnlineConfirmation ? <span className={viewStyles.agenda_pending_confirmation}><i aria-hidden="true">◷</i>Aguardando confirmação</span> : null}{pendingOnlinePayment ? <span className={viewStyles.agenda_pending_confirmation}><i aria-hidden="true">◷</i>Aguardando pagamento</span> : null}</div>{occurrence.participants.some((participant) => isConfirmedSchedulePaymentMethod(participant.paymentMethod)) ? <span className={viewStyles.agenda_payment_indicator} title="Pagamento confirmado">$</span> : null}</div></AgendaSlotDialog></div></td>; }
      const rule = court.weeklyRules.find((item) => item.weekday === weekday && item.startsAtMinute <= slot && item.endsAtMinute > slot);
      if (!rule || !rule.available) return <td className={viewStyles.daily_court_unavailable} key={court.id}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} servicePrices={servicePriceValues} slot={{ courtId: court.id, courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(slot), endsAt: minuteLabel(slot + arena.scheduleSlotMinutes), state: "UNAVAILABLE" }}><span>Indisponível</span></AgendaSlotDialog></td>;
      return <td className={viewStyles.daily_court_available} key={court.id}><AgendaSlotDialog players={players} courts={courtOptions} teachers={teachers} bookingTypes={bookingTypes} servicePrices={servicePriceValues} slot={{ courtId: court.id, courtName: court.name, dateLabel: selectedDateLabel, dateValue: dateInputValue(selectedDate), startsAt: minuteLabel(slot), endsAt: minuteLabel(slot + arena.scheduleSlotMinutes), state: "AVAILABLE", priceCents: rule.priceCents, pricingRules: court.weeklyRules }}><span>Livre</span></AgendaSlotDialog></td>;
    })}</tr>)}</tbody></table></div> : <div className={viewStyles.agenda_empty}><h2>Nenhuma quadra configurada</h2><p>Cadastre e programe as quadras pelo menu Configurações.</p></div>}
  </div>;
}
