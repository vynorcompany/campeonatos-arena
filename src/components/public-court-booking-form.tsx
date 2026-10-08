"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-court-booking-form.utilities";

import { useMemo, useState, useTransition } from "react";
import { cancelPublicCourtBookingRequestAction, createPublicCourtBookingAction } from "@/lib/actions/calendar";
import { resolvePublicBookingSelection } from "@/lib/calendar/public-booking-selection";

type Slot = { startsAt: string; label: string; priceCents: number; durations: number[]; availableMinutes: number[]; blockedMinutes: number[] };
type Court = { id: string; name: string; color: string; slotMinutes: number; slots: Slot[] };

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function duration(minutes: number) { return minutes % 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}` : `${minutes / 60}h`; }

function dateMinute(value: string) { const [, time = "00:00"] = value.split("T"); const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; }
function endLabel(startsAt: string, minutes: number) { const value = dateMinute(startsAt) + minutes; return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

type PendingReservation = { id: string; label: string; status: "PENDING_PAYMENT" | "PENDING_CONFIRMATION" };

export function PublicCourtBookingForm({ arenaSlug, courts, currentClient, layout, paymentOnlineEnabled, reservedSlots, pendingReservation, embedded = false }: { arenaSlug: string; courts: Court[]; currentClient: { name: string }; layout: string; paymentOnlineEnabled: boolean; reservedSlots: string[]; pendingReservation: PendingReservation | null; embedded?: boolean }) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const court = courts.find((item) => item.id === courtId) ?? courts[0];
  const [startsAt, setStartsAt] = useState(court?.slots[0]?.startsAt ?? "");
  const slot = court?.slots.find((item) => item.startsAt === startsAt) ?? court?.slots[0];
  const [durationMinutes, setDurationMinutes] = useState(slot?.durations[0] ?? 60);
  const [message, setMessage] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleSlots = useMemo(() => court?.slots ?? [], [court]);
  const selection = useMemo(() => !court || !slot || !startsAt ? { selectedMinutes: [], conflictingMinutes: [], hasConflict: false } : resolvePublicBookingSelection({ startsAtMinute: dateMinute(startsAt), durationMinutes, slotMinutes: court.slotMinutes, availableMinutes: slot.availableMinutes, blockedMinutes: slot.blockedMinutes }), [court, durationMinutes, slot, startsAt]);
  const selectedSlotMinutes = useMemo(() => new Set(selection.selectedMinutes), [selection]);
  const selectedTotalCents = useMemo(() => selection.selectedMinutes.reduce((total, minute) => total + (visibleSlots.find((item) => dateMinute(item.startsAt) === minute)?.priceCents ?? 0), 0), [selection, visibleSlots]);

  if (!courts.length) return <p className={viewStyles.public_booking_empty}>Não há horários disponíveis para reserva online nesta data.</p>;

  const changeCourt = (nextCourtId: string) => { const nextCourt = courts.find((item) => item.id === nextCourtId); setCourtId(nextCourtId); setStartsAt(nextCourt?.slots[0]?.startsAt ?? ""); setDurationMinutes(nextCourt?.slots[0]?.durations[0] ?? 60); };
  const changeSlot = (nextStartsAt: string) => { setStartsAt(nextStartsAt); };
  const submit = (form: HTMLFormElement) => { const data = new FormData(form); data.set("arenaSlug", arenaSlug); data.set("courtId", courtId); data.set("startsAt", startsAt); data.set("durationMinutes", String(durationMinutes)); setMessage(""); setCalendarUrl(""); startTransition(async () => { try { const result = await createPublicCourtBookingAction(data); if (result.checkoutUrl) { window.location.assign(result.checkoutUrl); return; } form.reset(); setCalendarUrl(result.reservationStatus === "SCHEDULED" ? result.calendarUrl : ""); setMessage(result.reservationStatus === "SCHEDULED" ? "Reserva confirmada com sucesso." : "Reserva enviada com sucesso. A arena confirmará seu horário em breve."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar sua reserva."); } }); };
  const cancelPendingReservation = () => { if (!pendingReservation) return; setMessage(""); startTransition(async () => { try { const data = new FormData(); data.set("arenaSlug", arenaSlug); data.set("occurrenceId", pendingReservation.id); await cancelPublicCourtBookingRequestAction(data); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível cancelar a solicitação."); } }); };

  const mobileForm = embedded ? "tw:viewport-700:border-0! tw:viewport-700:bg-transparent! tw:viewport-700:[background-image:none]! tw:viewport-700:p-0! tw:viewport-700:shadow-none! tw:viewport-700:[&_strong]:text-[#133047]! tw:viewport-700:dark:[&_strong]:text-[#eff8f8]! tw:viewport-700:[&_select]:border-[#d8e5e9]! tw:viewport-700:[&_select]:bg-white! tw:viewport-700:[&_select]:text-[#133047]! tw:viewport-700:dark:[&_select]:border-[#244759]! tw:viewport-700:dark:[&_select]:bg-[#102f42]! tw:viewport-700:dark:[&_select]:text-[#eff8f8]!" : "";
  return <form className={cx(layout === "LIST" ? viewStyles.public_booking_form_public_booking_form_list : viewStyles.public_booking_form, mobileForm)} onSubmit={(event) => { event.preventDefault(); submit(event.currentTarget); }}>
    <section className={viewStyles.public_booking_court_picker} aria-label="Quadra">
      <strong>Quadra</strong>
      <div>
        {courts.map((item) => <button type="button" key={item.id} className={cx(`${viewStyles.public_booking_court_card}${item.id === courtId ? " is-active" : ""}`, embedded ? item.id === courtId ? "tw:viewport-700:border-[#078f7c]! tw:viewport-700:bg-[#def2ed]! tw:viewport-700:text-[#075d48]! tw:viewport-700:[&_small]:text-[#087b63]! tw:viewport-700:dark:border-[#5bdec1]! tw:viewport-700:dark:bg-[#144c4e]! tw:viewport-700:dark:text-[#eff8f8]! tw:viewport-700:dark:[&_small]:text-[#b6e9db]!" : "tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:text-[#133047]! tw:viewport-700:[&_small]:text-[#607e8d]! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:dark:bg-[#102f42]! tw:viewport-700:dark:text-[#eff8f8]! tw:viewport-700:dark:[&_small]:text-[#a1bccb]!" : "")} onClick={() => changeCourt(item.id)} style={{ borderLeftColor: item.color }} aria-pressed={item.id === courtId}><i style={{ backgroundColor: item.color }} aria-hidden="true" /><span>{item.name}</span><small>{item.id === courtId ? "Selecionada" : "Selecionar"}</small></button>)}
      </div>
    </section>
    {layout === "LIST" ? <label className={viewStyles.field}>Horário<select value={startsAt} onChange={(event) => changeSlot(event.target.value)}>{visibleSlots.map((item) => <option value={item.startsAt} key={item.startsAt}>{item.label} · {money(item.priceCents)}</option>)}</select></label> : <section className={cx(viewStyles.public_booking_slot_blocks, embedded ? "tw:viewport-700:[&_>_div]:grid-cols-3! tw:viewport-700:[&_>_strong]:text-[#133047]! tw:viewport-700:dark:[&_>_strong]:text-[#eff8f8]!" : "")}><strong>Horários disponíveis</strong><div>{visibleSlots.map((item) => { const selected = selectedSlotMinutes.has(dateMinute(item.startsAt)); return <button type="button" className={cx(`${viewStyles.public_booking_slot_block}${selected ? " " + viewStyles.public_booking_slot_block_selected : ""}${startsAt === item.startsAt ? " " + viewStyles.public_booking_slot_block_active : ""}`, embedded ? startsAt === item.startsAt ? "tw:viewport-700:border-[#078f7c]! tw:viewport-700:bg-[#def2ed]! tw:viewport-700:text-[#075d48]! tw:viewport-700:dark:border-[#5bdec1]! tw:viewport-700:dark:bg-[#144c4e]! tw:viewport-700:dark:text-[#eff8f8]!" : "tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:text-[#133047]! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:dark:bg-[#102f42]! tw:viewport-700:dark:text-[#eff8f8]!" : "")} onClick={() => changeSlot(item.startsAt)} key={item.startsAt}><b>{item.label}</b><small>{money(item.priceCents)}</small></button>; })}{selection.conflictingMinutes.map((minute) => <span className={viewStyles.public_booking_slot_block_public_booking_slot_block_conflict} key={`conflict-${minute}`}><b>{endLabel(startsAt, minute - dateMinute(startsAt))}</b><small>Conflito</small></span>)}</div></section>}
    <label className={cx(viewStyles.field_public_booking_duration_field, embedded ? "tw:viewport-700:text-[#133047]! tw:viewport-700:dark:text-[#eff8f8]!" : "")}>Duração<select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>{Array.from(new Set([durationMinutes, ...(slot?.durations ?? [])])).sort((first, second) => first - second).map((item) => <option value={item} key={item}>{duration(item)} · até {endLabel(startsAt, item)}</option>)}</select></label>
    {selection.hasConflict ? <p className={viewStyles.public_booking_conflict} role="alert">Há uma reserva conflitando com este período. Escolha outro horário ou uma duração menor.</p> : null}
    <section className={cx(viewStyles.public_booking_client_summary, embedded ? "tw:viewport-700:border-[#d8e5e9]! tw:viewport-700:bg-white! tw:viewport-700:dark:border-[#244759]! tw:viewport-700:dark:bg-[#102f42]! tw:viewport-700:[&_span]:text-[#607e8d]! tw:viewport-700:dark:[&_span]:text-[#a1bccb]! tw:viewport-700:[&_small]:text-[#607e8d]! tw:viewport-700:dark:[&_small]:text-[#a1bccb]!" : "")}><div><span>RESERVA PARA</span><strong>{currentClient.name}</strong><small>Você está usando sua conta de cliente.</small></div><div className={viewStyles.public_booking_total}><span>Valor total</span><strong>{money(selectedTotalCents)}</strong></div></section>
    {pendingReservation ? <section className={viewStyles.public_booking_pending}><strong>{pendingReservation.status === "PENDING_PAYMENT" ? "Aguardando pagamento" : "Aguardando confirmação"}</strong><span>{pendingReservation.label}</span><small>{pendingReservation.status === "PENDING_PAYMENT" ? "Conclua o pagamento para confirmar sua reserva." : "A arena avisará você assim que confirmar a reserva."}</small><button type="button" className={viewStyles.button_button_small} disabled={pending} onClick={cancelPendingReservation}>Cancelar solicitação</button></section> : null}
    <button className={cx(viewStyles.button_button_primary, embedded ? "tw:viewport-700:bg-[#078f7c]! tw:viewport-700:[background-image:none]! tw:viewport-700:text-white! tw:viewport-700:dark:bg-[#5bdec1]! tw:viewport-700:dark:text-[#082b34]!" : "")} disabled={pending || selection.hasConflict}>{pending ? "Abrindo pagamento..." : paymentOnlineEnabled ? "Ir para pagamento" : "Solicitar reserva"}</button>
    {reservedSlots.length ? <section className={viewStyles.public_booking_reserved_slots}><strong>Horários reservados</strong><span>{reservedSlots.join(" · ")}</span></section> : null}
    {message ? <p className={viewStyles.public_booking_message} role="status">{message}{calendarUrl ? <> <a href={calendarUrl}>Adicionar ao meu calendário</a></> : null}</p> : null}
  </form>;
}
