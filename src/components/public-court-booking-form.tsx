"use client";
import { servicePermitsDuration, servicePermitsInterval, serviceRuleDetails } from "@/lib/calendar/service-booking-rules";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { servicePriceCents } from "@/lib/products/service-pricing";
import { CalendarDragScroll } from "@/components/calendar-drag-scroll";
import { ToggleSwitch } from "@/components/forms/toggle-switch";
import { peakServiceOccupancy, type PortalBookingService } from "@/lib/calendar/service-capacity";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-court-booking-form.utilities";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { cancelPublicCourtBookingRequestAction, createPublicCourtBookingAction } from "@/lib/actions/calendar";
import { resolvePublicBookingSelection } from "@/lib/calendar/public-booking-selection";

type Slot = { startsAt: string; label: string; priceCents: number; durationPrices: Record<number, number>; durations: number[]; standardDurations: number[]; availableMinutes: number[]; blockedMinutes: number[] };
type Court = { id: string; name: string; color: string; slotMinutes: number; slots: Slot[] };

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function duration(minutes: number) { return minutes % 60 ? (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`) : `${minutes / 60}h`; }

function dateMinute(value: string) { const [, time = "00:00"] = value.split("T"); const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; }
function endLabel(startsAt: string, minutes: number) { const value = dateMinute(startsAt) + minutes; return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

type PendingReservation = { id: string; label: string; status: "PENDING_PAYMENT" | "PENDING_CONFIRMATION" };

export function PublicCourtBookingForm({ arenaSlug, matchId, matchSummary, courts, services = [], currentClient, layout, paymentOnlineEnabled, reservedSlots, pendingReservation, bookingBlocked = false, embedded = false }: { arenaSlug: string; matchId?: string; matchSummary?: { title: string; athletes: string[] }; courts: Court[]; services?: PortalBookingService[]; currentClient: { name: string }; layout: string; paymentOnlineEnabled: boolean; reservedSlots: string[]; pendingReservation: PendingReservation | null; bookingBlocked?: boolean; embedded?: boolean }) {
  const router = useRouter();
  const [requestedCourtId, setCourtId] = useState(courts[0]?.id ?? "");
  const court = courts.find((item) => item.id === requestedCourtId) ?? courts[0];
  const courtId = court?.id ?? "";
  const [requestedStartsAt, setStartsAt] = useState(court?.slots[0]?.startsAt ?? "");
  const slot = court?.slots.find((item) => item.startsAt === requestedStartsAt) ?? court?.slots[0];
  const startsAt = slot?.startsAt ?? "";
  const [requestedDurationMinutes, setDurationMinutes] = useState(slot?.durations[0] ?? 60);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const selectedServices = services.filter(service => selectedServiceIds.includes(service.id));
  const weekday = startsAt ? new Date(`${startsAt.slice(0,10)}T12:00:00`).getDay() : 0;
  const allowedDurations = (slot?.durations ?? []).filter(minutes => servicePermitsDuration(slot?.standardDurations ?? [], minutes, selectedServices, courtId, weekday, dateMinute(startsAt), court?.slotMinutes ?? 30));
  const durationMinutes = allowedDurations.includes(requestedDurationMinutes) ? requestedDurationMinutes : allowedDurations[0] ?? slot?.durations[0] ?? 60;
  const [message, setMessage] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleSlots = useMemo(() => court?.slots ?? [], [court]);
  const selection = useMemo(() => !court || !slot || !startsAt ? { selectedMinutes: [], conflictingMinutes: [], hasConflict: false } : resolvePublicBookingSelection({ startsAtMinute: dateMinute(startsAt), durationMinutes, slotMinutes: court.slotMinutes, availableMinutes: slot.availableMinutes, blockedMinutes: slot.blockedMinutes }), [court, durationMinutes, slot, startsAt]);
  const selectedSlotMinutes = useMemo(() => new Set(selection.selectedMinutes), [selection]);
  const courtTotalCents = slot?.durationPrices[durationMinutes] ?? 0;
  const selectedTotalCents = courtTotalCents + selectedServices.reduce((sum, service) => sum + servicePriceCents(service.priceCents, Boolean(service.serviceHourly), durationMinutes), 0);
  const availableServices = services.map(service => {
    const compatible = (slot?.durations ?? []).filter(minutes => servicePermitsDuration(slot?.standardDurations ?? [], minutes, [...selectedServices.filter(item => item.id !== service.id),service], courtId, weekday, dateMinute(startsAt), court?.slotMinutes ?? 30) && !resolvePublicBookingSelection({ startsAtMinute: dateMinute(startsAt), durationMinutes: minutes, slotMinutes: court?.slotMinutes ?? 30, availableMinutes: slot?.availableMinutes ?? [], blockedMinutes: slot?.blockedMinutes ?? [] }).hasConflict && peakServiceOccupancy(service.busy, dateMinute(startsAt), dateMinute(startsAt)+minutes) < service.limit);
    const available = Math.max(0, service.limit - peakServiceOccupancy(service.busy, dateMinute(startsAt), dateMinute(startsAt) + durationMinutes));
    return { ...service, available, compatible };
  });
  const serviceConflict = availableServices.some(service => selectedServiceIds.includes(service.id) && (service.available === 0 || !servicePermitsInterval(service.rules, courtId, weekday, dateMinute(startsAt), durationMinutes))) || !allowedDurations.length;
  const requiresPayment = paymentOnlineEnabled && selectedTotalCents > 0;

  const changeCourt = (nextCourtId: string) => { const nextCourt = courts.find((item) => item.id === nextCourtId); setCourtId(nextCourtId); setStartsAt(nextCourt?.slots[0]?.startsAt ?? ""); setDurationMinutes(nextCourt?.slots[0]?.durations[0] ?? 60); };
  const changeSlot = (nextStartsAt: string) => { setStartsAt(nextStartsAt); };
  const submit = (form: HTMLFormElement) => { const data = new FormData(form); data.set("arenaSlug", arenaSlug); if (matchId) data.set("matchId", matchId); data.set("courtId", courtId); data.set("startsAt", startsAt); data.set("durationMinutes", String(durationMinutes)); data.set("quotedTotalCents", String(selectedTotalCents)); for (const service of selectedServices) data.append("serviceIds", service.id); setMessage(""); setCalendarUrl(""); startTransition(async () => { try { const result = await createPublicCourtBookingAction(data); if (!result.ok) { setMessage(result.error); router.refresh(); return; } if (result.checkoutUrl) { window.location.assign(result.checkoutUrl); return; } form.reset(); setCalendarUrl(result.reservationStatus === "SCHEDULED" ? result.calendarUrl : ""); setMessage(result.reservationStatus === "SCHEDULED" ? "Reserva confirmada com sucesso." : "Reserva enviada com sucesso. A arena confirmará seu horário em breve."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar sua reserva."); } }); };
  const cancelPendingReservation = () => { if (!pendingReservation) return; setMessage(""); startTransition(async () => { try { const data = new FormData(); data.set("arenaSlug", arenaSlug); data.set("occurrenceId", pendingReservation.id); await cancelPublicCourtBookingRequestAction(data); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível cancelar a solicitação."); } }); };
  const pendingNotice = pendingReservation ? <section className={viewStyles.public_booking_pending}><strong>{pendingReservation.status === "PENDING_PAYMENT" ? "Aguardando pagamento" : "Aguardando confirmação"}</strong><span>{pendingReservation.label}</span><small>{pendingReservation.status === "PENDING_PAYMENT" ? "Conclua o pagamento para confirmar sua reserva." : "A arena avisará você assim que confirmar a reserva."}</small><div className={viewStyles.public_booking_pending_actions}>{pendingReservation.status === "PENDING_PAYMENT" ? <a className={viewStyles.button_button_small} href={`/reservar/${encodeURIComponent(arenaSlug)}/pagamento/${encodeURIComponent(pendingReservation.id)}`}>Concluir pagamento</a> : null}<button type="button" className={viewStyles.button_button_small} disabled={pending} onClick={cancelPendingReservation}>Cancelar solicitação</button></div></section> : null;

  if (!courts.length) return <div className="tw:grid tw:gap-3"><p className={viewStyles.public_booking_empty}>Não há horários disponíveis para reserva online nesta data.</p>{pendingNotice}{message ? <p className={viewStyles.public_booking_message} role="status">{message}</p> : null}</div>;

  const surface = "tw:rounded-lg tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:dark:border-[#293648] tw:dark:bg-[#0b1a30]";
  const toggleService = (id: string, checked: boolean, compatible: number[]) => {
    setSelectedServiceIds(ids => checked ? [...ids,id] : ids.filter(item => item !== id));
    if (checked && !compatible.includes(durationMinutes) && compatible.length) setDurationMinutes(compatible[0]);
  };
  return <form className="tw:grid tw:min-w-0 tw:gap-5 tw:text-[#133047] tw:dark:text-[#eff3f8]" onSubmit={event => { event.preventDefault(); submit(event.currentTarget); }}>
    <section className="tw:grid tw:min-w-0 tw:gap-2" aria-label="Quadra">
      <span className="tw:text-sm tw:font-medium">Quadra</span>
      <CalendarDragScroll dragFromControls className="tw:flex tw:min-w-0 tw:snap-x tw:gap-3 tw:overflow-x-auto tw:pb-2 tw:cursor-grab tw:touch-pan-x">
        {courts.map(item => <button type="button" key={item.id} aria-pressed={item.id === courtId} className={cx("tw:flex tw:min-h-12 tw:min-w-36 tw:shrink-0 tw:snap-start tw:items-center tw:gap-2 tw:rounded-md tw:border tw:px-4 tw:py-3 tw:text-sm tw:font-normal", item.id === courtId ? "tw:border-[#174983] tw:bg-[#174983] tw:text-white" : "tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:dark:border-[#3b4e66] tw:dark:bg-[#101c2d] tw:dark:text-[#eff3f8]")} onClick={event => { changeCourt(item.id); event.currentTarget.scrollIntoView({block:'nearest',inline:'nearest'}); }}><i className="tw:size-2 tw:rounded-full" style={{backgroundColor:item.color}}/>{item.name}</button>)}
      </CalendarDragScroll>
    </section>
    {services.length ? <section aria-label="Serviços opcionais da reserva" className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-700:grid-cols-1"><h3 className="tw:col-span-full tw:m-0 tw:text-sm tw:font-medium">Serviços opcionais</h3>{availableServices.map(service => {
      const checked=selectedServiceIds.includes(service.id);
      const details = service.conditions ?? serviceRuleDetails(service.rules,courts);
      return <article key={service.id} className={cx(surface,"tw:flex tw:min-w-0 tw:flex-col tw:gap-3")}>
        <ToggleSwitch compact tone="blue" label={service.name} checked={checked} disabled={pending || (!checked && !service.compatible.length)} onCheckedChange={next => toggleService(service.id,next,service.compatible)}/>
        {service.rules.minimumMinutes ? <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[#174983] tw:dark:text-[#9bc5ff]">Ao selecionar, reserve a partir de {duration(service.rules.minimumMinutes)}.</p> : null}
        <dl className="tw:m-0 tw:grid tw:grid-cols-[auto_minmax(0,1fr)] tw:gap-x-3 tw:gap-y-1.5 tw:text-xs tw:leading-relaxed">{details.map(detail => <div key={detail.label} className="tw:contents"><dt className="tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{detail.label}</dt><dd className="tw:m-0 tw:min-w-0 tw:break-words">{detail.value}</dd></div>)}</dl>
        <div className="tw:mt-auto tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-2 tw:border-t tw:border-[#d8e5e9] tw:pt-3 tw:text-xs tw:dark:border-[#293648]"><div className="tw:grid tw:gap-1"><span className="tw:tabular-nums">{money(servicePriceCents(service.priceCents,Boolean(service.serviceHourly),durationMinutes))} · {duration(durationMinutes)}</span><span className="tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{service.serviceHourly ? `${money(service.priceCents)}/h` : "Valor fixo por reserva"}</span></div><span className="tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{service.compatible.length ? service.available ? `${service.available} disponível(is)` : "Disponível para períodos menores" : "Indisponível nesta quadra ou período"}</span></div>
      </article>;
    })}</section> : null}
    <section className="tw:grid tw:min-w-0 tw:gap-3" aria-label="Horário e duração">
      <div className="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-3"><span className="tw:text-sm tw:font-medium">Horários disponíveis</span><label className={cx(ui.field,"tw:min-w-48 tw:viewport-700:w-full")}>Duração<select value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value))}>{allowedDurations.map(minutes => <option key={minutes} value={minutes}>{duration(minutes)} · até {endLabel(startsAt,minutes)}</option>)}{!allowedDurations.length ? <option value={durationMinutes}>Selecione um serviço compatível</option> : null}</select></label></div>
      {layout === "LIST" ? <label className={ui.field}>Horário<select value={startsAt} onChange={event=>changeSlot(event.target.value)}>{visibleSlots.map(item=><option key={item.startsAt} value={item.startsAt}>{item.label}</option>)}</select></label> : <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(85px,1fr))] tw:gap-2">{visibleSlots.map(item=>{
        const selected=selectedSlotMinutes.has(dateMinute(item.startsAt));
        return <button key={item.startsAt} type="button" aria-pressed={selected} className={cx("tw:grid tw:min-h-14 tw:gap-1 tw:rounded-md tw:border tw:px-2 tw:py-2 tw:text-left tw:text-sm tw:font-normal tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8] tw:dark:focus-visible:outline-[#9bc5ff]",selected?"tw:border-[#174983] tw:bg-[#174983] tw:text-white":"tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:dark:border-[#3b4e66] tw:dark:bg-[#101c2d] tw:dark:text-[#eff3f8]")} onClick={()=>changeSlot(item.startsAt)}><span>{item.label}</span><small className="tw:text-[11px]">{money(item.durationPrices[durationMinutes] ?? item.priceCents)}</small></button>;
      })}</div>}
      {selectedServices.some(service=>service.rules.minimumMinutes) ? <p className="tw:m-0 tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">Durações disponíveis atualizadas conforme os serviços selecionados.</p> : null}
    </section>
    {serviceConflict ? <p role="alert" className="tw:text-sm tw:text-red-700 tw:dark:text-red-300">Confira os serviços selecionados: esta quadra, duração ou faixa de horário não está disponível.</p> : null}
    {selection.hasConflict ? <p className={viewStyles.public_booking_conflict} role="alert">Há uma reserva conflitando com este período. Escolha outro horário ou uma duração menor.</p> : null}
    <section aria-label="Resumo da reserva" className={cx(surface,"tw:grid tw:min-w-0 tw:gap-4")}>
      <header className="tw:grid tw:gap-1"><h3 className="tw:m-0 tw:text-sm tw:font-medium">Resumo da reserva</h3><p className="tw:m-0 tw:break-words tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">Reserva para {matchSummary?.title ?? currentClient.name}</p>{matchSummary ? <p className="tw:m-0 tw:break-words tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{matchSummary.athletes.join(' · ')}</p> : null}<time dateTime={startsAt.slice(0,10)} className="tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{startsAt.slice(0,10).split('-').reverse().join('/')}</time></header>
      <ul className="tw:m-0 tw:grid tw:list-none tw:gap-3 tw:p-0">{[{ id: courtId, name: `Quadra ${court?.name}`, priceCents: courtTotalCents, fixed: false }, ...selectedServices.map(service => ({ id: service.id, name: service.name, priceCents: servicePriceCents(service.priceCents,Boolean(service.serviceHourly),durationMinutes), fixed: !service.serviceHourly }))].map(item => <li key={item.id} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:items-start tw:gap-x-4 tw:gap-y-1"><div className="tw:grid tw:min-w-0 tw:gap-1"><span className="tw:break-words tw:text-sm">{item.name}</span><span className="tw:break-words tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{duration(durationMinutes)} · {slot?.label} às {endLabel(startsAt,durationMinutes)}{item.fixed ? " · valor fixo" : ""}</span></div><span className="tw:whitespace-nowrap tw:text-sm tw:tabular-nums tw:text-[#087443] tw:dark:text-[#6ee7b7]">{money(item.priceCents)}</span></li>)}</ul>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-t tw:border-[#d8e5e9] tw:pt-4 tw:dark:border-[#293648]"><span className="tw:text-sm">Valor total</span><output aria-label="Valor total da reserva" aria-live="polite" className="tw:text-2xl tw:font-semibold tw:tabular-nums tw:text-[#087443]! tw:dark:text-[#6ee7b7]!">{money(selectedTotalCents)}</output></div>
    </section>
    {pendingNotice}
    <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-3 tw:border-t tw:border-[#d8e5e9] tw:pt-4 tw:dark:border-[#293648]"><button className={ui.primary} data-portal-action disabled={pending || selection.hasConflict || serviceConflict || bookingBlocked}>{bookingBlocked ? "Reserva indisponível por pendência financeira" : pending ? "Enviando reserva…" : requiresPayment ? "Ir para pagamento" : "Solicitar reserva"}</button></footer>
    {reservedSlots.length ? <section className="tw:grid tw:gap-1 tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]"><span>Horários reservados</span><span>{reservedSlots.join(' · ')}</span></section> : null}
    {message ? <p role="status" className="tw:text-sm">{message}{calendarUrl ? <> <a href={calendarUrl}>Adicionar ao meu calendário</a></> : null}</p> : null}
  </form>;
}
