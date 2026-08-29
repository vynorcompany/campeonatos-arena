"use client";

import { useMemo, useState, useTransition } from "react";
import { createPublicCourtBookingAction } from "@/lib/actions/calendar";
import { resolvePublicBookingSelection } from "@/lib/calendar/public-booking-selection";

type Slot = { startsAt: string; label: string; priceCents: number; durations: number[]; availableMinutes: number[]; blockedMinutes: number[] };
type Court = { id: string; name: string; color: string; slotMinutes: number; slots: Slot[] };

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function duration(minutes: number) { return minutes % 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}` : `${minutes / 60}h`; }

function dateMinute(value: string) { const [, time = "00:00"] = value.split("T"); const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; }
function endLabel(startsAt: string, minutes: number) { const value = dateMinute(startsAt) + minutes; return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

export function PublicCourtBookingForm({ arenaSlug, courts, currentClient, layout, paymentOnlineEnabled, reservedSlots, pendingReservations }: { arenaSlug: string; courts: Court[]; currentClient: { name: string }; layout: string; paymentOnlineEnabled: boolean; reservedSlots: string[]; pendingReservations: string[] }) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const court = courts.find((item) => item.id === courtId) ?? courts[0];
  const [startsAt, setStartsAt] = useState(court?.slots[0]?.startsAt ?? "");
  const slot = court?.slots.find((item) => item.startsAt === startsAt) ?? court?.slots[0];
  const [durationMinutes, setDurationMinutes] = useState(slot?.durations[0] ?? 60);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleSlots = useMemo(() => court?.slots ?? [], [court]);
  const selection = useMemo(() => !court || !slot || !startsAt ? { selectedMinutes: [], conflictingMinutes: [], hasConflict: false } : resolvePublicBookingSelection({ startsAtMinute: dateMinute(startsAt), durationMinutes, slotMinutes: court.slotMinutes, availableMinutes: slot.availableMinutes, blockedMinutes: slot.blockedMinutes }), [court, durationMinutes, slot, startsAt]);
  const selectedSlotMinutes = useMemo(() => new Set(selection.selectedMinutes), [selection]);
  const selectedTotalCents = useMemo(() => selection.selectedMinutes.reduce((total, minute) => total + (visibleSlots.find((item) => dateMinute(item.startsAt) === minute)?.priceCents ?? 0), 0), [selection, visibleSlots]);

  if (!courts.length) return <p className="public-booking-empty">Não há horários disponíveis para reserva online nesta data.</p>;

  const changeCourt = (nextCourtId: string) => { const nextCourt = courts.find((item) => item.id === nextCourtId); setCourtId(nextCourtId); setStartsAt(nextCourt?.slots[0]?.startsAt ?? ""); setDurationMinutes(nextCourt?.slots[0]?.durations[0] ?? 60); };
  const changeSlot = (nextStartsAt: string) => { setStartsAt(nextStartsAt); };
  const submit = (form: HTMLFormElement) => { const data = new FormData(form); data.set("arenaSlug", arenaSlug); data.set("courtId", courtId); data.set("startsAt", startsAt); data.set("durationMinutes", String(durationMinutes)); setMessage(""); startTransition(async () => { try { await createPublicCourtBookingAction(data); form.reset(); setMessage(paymentOnlineEnabled ? "Reserva enviada. O pagamento online será solicitado pela arena." : "Reserva enviada com sucesso. A arena confirmará seu horário em breve."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar sua reserva."); } }); };

  return <form className={layout === "LIST" ? "public-booking-form public-booking-form-list" : "public-booking-form"} onSubmit={(event) => { event.preventDefault(); submit(event.currentTarget); }}>
    <label className="field">Quadra<select value={courtId} onChange={(event) => changeCourt(event.target.value)}>{courts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    {layout === "LIST" ? <label className="field">Horário<select value={startsAt} onChange={(event) => changeSlot(event.target.value)}>{visibleSlots.map((item) => <option value={item.startsAt} key={item.startsAt}>{item.label} · {money(item.priceCents)}</option>)}</select></label> : <section className="public-booking-slot-blocks"><strong>Horários disponíveis</strong><div>{visibleSlots.map((item) => { const selected = selectedSlotMinutes.has(dateMinute(item.startsAt)); return <button type="button" className={`public-booking-slot-block${selected ? " public-booking-slot-block-selected" : ""}${startsAt === item.startsAt ? " public-booking-slot-block-active" : ""}`} onClick={() => changeSlot(item.startsAt)} key={item.startsAt}><b>{item.label}</b><small>{money(item.priceCents)}</small></button>; })}{selection.conflictingMinutes.map((minute) => <span className="public-booking-slot-block public-booking-slot-block-conflict" key={`conflict-${minute}`}><b>{endLabel(startsAt, minute - dateMinute(startsAt))}</b><small>Conflito</small></span>)}</div></section>}
    <label className="field">Duração<select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>{Array.from(new Set([durationMinutes, ...(slot?.durations ?? [])])).sort((first, second) => first - second).map((item) => <option value={item} key={item}>{duration(item)} · até {endLabel(startsAt, item)}</option>)}</select></label>
    {selection.hasConflict ? <p className="public-booking-conflict" role="alert">Há uma reserva conflitando com este período. Escolha outro horário ou uma duração menor.</p> : null}
    <section className="public-booking-client-summary"><div><span>RESERVA PARA</span><strong>{currentClient.name}</strong><small>Você está usando sua conta de cliente.</small></div><div className="public-booking-total"><span>Valor total</span><strong>{money(selectedTotalCents)}</strong></div></section>
    {pendingReservations.length ? <section className="public-booking-pending"><strong>Aguardando confirmação</strong><span>{pendingReservations.join(" · ")}</span><small>A arena avisará você assim que confirmar a reserva.</small></section> : null}
    <button className="button button-primary" disabled={pending || selection.hasConflict}>{pending ? "Enviando..." : "Solicitar reserva"}</button>
    {reservedSlots.length ? <section className="public-booking-reserved-slots"><strong>Horários reservados</strong><span>{reservedSlots.join(" · ")}</span></section> : null}
    {message ? <p className="public-booking-message" role="status">{message}</p> : null}
  </form>;
}
