"use client";

import { useMemo, useState, useTransition } from "react";
import { createPublicCourtBookingAction } from "@/lib/actions/calendar";

type Slot = { startsAt: string; label: string; priceCents: number; durations: number[] };
type Court = { id: string; name: string; color: string; slots: Slot[] };

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function duration(minutes: number) { return minutes % 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}` : `${minutes / 60}h`; }

export function PublicCourtBookingForm({ arenaSlug, courts, layout, paymentOnlineEnabled, reservedSlots }: { arenaSlug: string; courts: Court[]; layout: string; paymentOnlineEnabled: boolean; reservedSlots: string[] }) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const court = courts.find((item) => item.id === courtId) ?? courts[0];
  const [startsAt, setStartsAt] = useState(court?.slots[0]?.startsAt ?? "");
  const slot = court?.slots.find((item) => item.startsAt === startsAt) ?? court?.slots[0];
  const [durationMinutes, setDurationMinutes] = useState(slot?.durations[0] ?? 60);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleSlots = useMemo(() => court?.slots ?? [], [court]);

  if (!courts.length) return <p className="public-booking-empty">Não há horários disponíveis para reserva online nesta data.</p>;

  const changeCourt = (nextCourtId: string) => { const nextCourt = courts.find((item) => item.id === nextCourtId); setCourtId(nextCourtId); setStartsAt(nextCourt?.slots[0]?.startsAt ?? ""); setDurationMinutes(nextCourt?.slots[0]?.durations[0] ?? 60); };
  const changeSlot = (nextStartsAt: string) => { const nextSlot = visibleSlots.find((item) => item.startsAt === nextStartsAt); setStartsAt(nextStartsAt); setDurationMinutes(nextSlot?.durations[0] ?? 60); };
  const submit = (form: HTMLFormElement) => { const data = new FormData(form); data.set("arenaSlug", arenaSlug); data.set("courtId", courtId); data.set("startsAt", startsAt); data.set("durationMinutes", String(durationMinutes)); setMessage(""); startTransition(async () => { try { await createPublicCourtBookingAction(data); form.reset(); setMessage(paymentOnlineEnabled ? "Reserva enviada. O pagamento online será solicitado pela arena." : "Reserva enviada com sucesso. A arena confirmará seu horário em breve."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar sua reserva."); } }); };

  return <form className={layout === "LIST" ? "public-booking-form public-booking-form-list" : "public-booking-form"} onSubmit={(event) => { event.preventDefault(); submit(event.currentTarget); }}>
    <label className="field">Quadra<select value={courtId} onChange={(event) => changeCourt(event.target.value)}>{courts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    {layout === "LIST" ? <label className="field">Horário<select value={startsAt} onChange={(event) => changeSlot(event.target.value)}>{visibleSlots.map((item) => <option value={item.startsAt} key={item.startsAt}>{item.label} · {money(item.priceCents)}</option>)}</select></label> : <section className="public-booking-slot-blocks"><strong>Horários disponíveis</strong><div>{visibleSlots.map((item) => <button type="button" className={startsAt === item.startsAt ? "public-booking-slot-block public-booking-slot-block-active" : "public-booking-slot-block"} onClick={() => changeSlot(item.startsAt)} key={item.startsAt}><b>{item.label}</b><small>{money(item.priceCents)}</small></button>)}</div></section>}
    <label className="field">Duração<select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>{slot?.durations.map((item) => <option value={item} key={item}>{duration(item)}</option>)}</select></label>
    <label className="field">Seu nome<input name="customerName" required minLength={3} /></label>
    <label className="field">Telefone<input name="phone" inputMode="tel" required minLength={8} /></label>
    <button className="button button-primary" disabled={pending}>{pending ? "Enviando..." : "Solicitar reserva"}</button>
    {reservedSlots.length ? <section className="public-booking-reserved-slots"><strong>Horários reservados</strong><span>{reservedSlots.join(" · ")}</span></section> : null}
    {message ? <p className="public-booking-message" role="status">{message}</p> : null}
  </form>;
}
