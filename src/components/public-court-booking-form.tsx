"use client";
import { servicePermitsDuration, servicePermitsInterval, serviceRuleDetails } from "@/lib/calendar/service-booking-rules";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { servicePriceCents } from "@/lib/products/service-pricing";

import { ToggleSwitch } from "@/components/forms/toggle-switch";
import { peakServiceOccupancy, type PortalBookingService } from "@/lib/calendar/service-capacity";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./public-court-booking-form.utilities";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { cancelPublicCourtBookingRequestAction, createPublicCourtBookingAction } from "@/lib/actions/calendar";
import { resolvePublicBookingSelection } from "@/lib/calendar/public-booking-selection";

type Slot = { startsAt: string; label: string; priceCents: number; durationPrices: Record<number, number>; durations: number[]; standardDurations: number[]; availableMinutes: number[]; blockedMinutes: number[] };
type Court = { id: string; name: string; color: string; slotMinutes: number; slots: Slot[] };

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function duration(minutes: number) { return minutes % 60 ? (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`) : `${minutes / 60}h`; }

function dateMinute(value: string) { const [, time = "00:00"] = value.split("T"); const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; }
function endLabel(startsAt: string, minutes: number) { const value = dateMinute(startsAt) + minutes; return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }

type PendingReservation = { id: string; label: string; status: "PENDING_PAYMENT" | "PENDING_CONFIRMATION" };

export function PublicCourtBookingForm({ arenaSlug, datePicker, matchId, matchSummary, courts, services = [], currentClient, layout, paymentOnlineEnabled, reservedSlots, pendingReservation, bookingBlocked = false, embedded = false }: { arenaSlug: string; datePicker?: ReactNode; matchId?: string; matchSummary?: { title: string; athletes: string[] }; courts: Court[]; services?: PortalBookingService[]; currentClient: { name: string }; layout: string; paymentOnlineEnabled: boolean; reservedSlots: string[]; pendingReservation: PendingReservation | null; bookingBlocked?: boolean; embedded?: boolean }) {
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
  const [reviewing, setReviewing] = useState(false);
  const courtRail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reviewing) return;
    const rail=courtRail.current;
    const selected=rail?.querySelector<HTMLElement>("[data-selected-court=true]");
    if (rail && selected) rail.scrollTo({left:selected.offsetLeft-rail.offsetLeft,behavior:"instant"});
  },[courtId,reviewing]);
  const selection = useMemo(() => !court || !slot || !startsAt ? { selectedMinutes: [], conflictingMinutes: [], hasConflict: false } : resolvePublicBookingSelection({ startsAtMinute: dateMinute(startsAt), durationMinutes, slotMinutes: court.slotMinutes, availableMinutes: slot.availableMinutes, blockedMinutes: slot.blockedMinutes }), [court, durationMinutes, slot, startsAt]);

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
  const pendingNotice = pendingReservation ? <section className={cx(viewStyles.public_booking_pending,"tw:dark:[&_strong]:text-[#9bc5ff]! tw:dark:[&_span]:text-[#eff3f8]! tw:dark:[&_small]:text-[#bdd9e6]!")}><strong>{pendingReservation.status === "PENDING_PAYMENT" ? "Aguardando pagamento" : "Aguardando confirmação"}</strong><span>{pendingReservation.label}</span><small>{pendingReservation.status === "PENDING_PAYMENT" ? "Conclua o pagamento para confirmar sua reserva." : "A arena avisará você assim que confirmar a reserva."}</small><div className={viewStyles.public_booking_pending_actions}>{pendingReservation.status === "PENDING_PAYMENT" ? <a className={viewStyles.button_button_small} href={`/reservar/${encodeURIComponent(arenaSlug)}/pagamento/${encodeURIComponent(pendingReservation.id)}`}>Concluir pagamento</a> : null}<button type="button" className={viewStyles.button_button_small} disabled={pending} onClick={cancelPendingReservation}>Cancelar solicitação</button></div></section> : null;

  if (!courts.length) return <div className="tw:grid tw:gap-3">{datePicker}<p className={viewStyles.public_booking_empty}>Não há horários disponíveis para reserva online nesta data.</p>{pendingNotice}{message ? <p className={viewStyles.public_booking_message} role="status">{message}</p> : null}</div>;

  const surface = "tw:rounded-lg tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:dark:border-[#293648] tw:dark:bg-[#0b1a30]";
  const toggleService = (id: string, checked: boolean, compatible: number[]) => {
    setSelectedServiceIds(ids => checked ? [...ids,id] : ids.filter(item => item !== id));
    if (checked && !compatible.includes(durationMinutes) && compatible.length) setDurationMinutes(compatible[0]);
  };
  const periods = [{ label: "Manhã", start: 0, end: 720 }, { label: "Tarde", start: 720, end: 1080 }, { label: "Noite", start: 1080, end: 1440 }];
  const slotButton = "tw:min-h-10 tw:min-w-0 tw:rounded-md tw:border tw:px-2 tw:py-2 tw:text-center tw:text-sm tw:font-normal tw:tabular-nums tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1e5ea8]";
  return <form className="tw:grid tw:min-w-0 tw:gap-6 tw:text-[#133047] tw:dark:text-[#eff3f8]" onSubmit={event => { event.preventDefault(); if (!reviewing) { setReviewing(true); return; } submit(event.currentTarget); }}>
    <ol aria-label="Etapas da reserva" className="tw:m-0 tw:grid tw:list-none tw:grid-cols-3 tw:gap-3 tw:border-b tw:border-[#d8e5e9] tw:p-0 tw:pb-4 tw:dark:border-[#293648] tw:viewport-700:gap-2">
      {["Escolha seu horário", "Revise a reserva", "Confirme e jogue"].map((label,index) => <li key={label} aria-current={index === (reviewing ? 1 : 0) ? "step" : undefined} className={cx("tw:flex tw:items-center tw:gap-2 tw:text-sm tw:viewport-700:items-start tw:viewport-700:text-xs",index === (reviewing ? 1 : 0) ? "tw:font-medium tw:text-[#174983] tw:dark:text-[#9bc5ff]" : "tw:text-[#52677d] tw:dark:text-[#bdd9e6]")}><span className={cx("tw:grid tw:size-7 tw:shrink-0 tw:place-items-center tw:rounded-full",index === (reviewing ? 1 : 0) ? "tw:bg-[#174983] tw:text-white" : "tw:bg-[#edf2f7] tw:dark:bg-[#213148]")}>{index+1}</span>{label}</li>)}
    </ol>
    <div className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_300px] tw:items-start tw:gap-6 tw:max-[1000px]:grid-cols-1">
    <div className="tw:grid tw:min-w-0 tw:gap-5">
    {reviewing ? <section className={surface} aria-label="Revisão da reserva"><h2 tabIndex={-1} className="tw:m-0 tw:text-xl tw:font-medium">Confira sua reserva</h2><p className="tw:my-3 tw:text-sm">{court?.name} · {slot?.label} às {endLabel(startsAt,durationMinutes)} · {duration(durationMinutes)}</p><p className="tw:my-3 tw:text-sm">{selectedServices.length ? selectedServices.map(service => service.name).join(" · ") : "Sem serviços adicionais"}</p><button type="button" className={ui.secondary} onClick={() => setReviewing(false)}>Alterar horário ou serviços</button></section> : <>
    <section aria-label="Horários disponíveis" className="tw:grid tw:min-w-0 tw:gap-3">
      <h2 className="tw:m-0 tw:text-xl tw:font-medium">Escolha quando jogar</h2>{datePicker}
      <div ref={courtRail} className="tw:relative tw:grid tw:min-w-0 tw:auto-cols-[minmax(210px,1fr)] tw:grid-rows-[auto_auto_auto_auto] tw:grid-flow-col tw:gap-3 tw:overflow-x-auto tw:pb-2 tw:snap-x tw:snap-mandatory tw:viewport-700:auto-cols-[85%] tw:viewport-700:grid-rows-1">
      {courts.map(item => <section key={item.id} data-selected-court={item.id === courtId} aria-label={`Horários da quadra ${item.name}`} className={cx("tw:row-span-4 tw:grid tw:min-w-0 tw:snap-start tw:grid-rows-subgrid tw:viewport-700:row-span-1 tw:viewport-700:self-start tw:viewport-700:grid-rows-[auto_auto_auto_auto] tw:overflow-hidden tw:rounded-lg tw:border",item.id === courtId ? "tw:border-[#174983] tw:ring-1 tw:ring-[#174983] tw:dark:border-[#9bc5ff] tw:dark:ring-[#9bc5ff]" : "tw:border-[#d8e5e9] tw:dark:border-[#3b4e66]")}>
        <h3 className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:border-b tw:border-[#d8e5e9] tw:bg-[#f3f7fc] tw:px-3 tw:py-4 tw:text-base tw:font-medium tw:dark:border-[#293648] tw:dark:bg-[#15263c]"><i className="tw:size-2.5 tw:shrink-0 tw:rounded-full" style={{backgroundColor:item.color}}/>{item.name}</h3>
        {periods.map(period => { const times=item.slots.filter(time => dateMinute(time.startsAt)>=period.start && dateMinute(time.startsAt)<period.end); return <div key={period.label} className="tw:min-h-36 tw:viewport-700:min-h-0 tw:border-b tw:border-[#d8e5e9] tw:p-3 tw:last:border-b-0 tw:dark:border-[#293648]"><h4 className="tw:mb-3 tw:mt-0 tw:text-xs tw:font-medium tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{period.label}</h4>{times.length ? layout === "LIST" ? <label className={ui.field}><span className="tw:sr-only">{item.name} · {period.label}</span><select aria-label={`${item.name} · ${period.label}`} value={item.id === courtId && times.some(time=>time.startsAt===startsAt) ? startsAt : ""} onChange={event=>{ if(event.target.value) { changeCourt(item.id); changeSlot(event.target.value); } }}><option value="">Escolha um horário</option>{times.map(time=><option key={time.startsAt} value={time.startsAt}>{time.label}</option>)}</select></label> : <div className="tw:grid tw:grid-cols-3 tw:gap-2">{times.map(time => { const selected=item.id===courtId && time.startsAt===startsAt; return <button key={time.startsAt} type="button" aria-label={`${item.name} às ${time.label}`} aria-pressed={selected} className={cx(slotButton,selected ? "tw:border-[#174983] tw:bg-[#174983] tw:text-white" : "tw:border-[#cad8e7] tw:bg-white tw:text-[#133047] tw:hover:border-[#174983] tw:dark:border-[#3b4e66] tw:dark:bg-[#101c2d] tw:dark:text-[#eff3f8]")} onClick={()=>{if(item.id!==courtId) changeCourt(item.id); changeSlot(time.startsAt);}}>{time.label}</button>; })}</div> : <p className="tw:m-0 tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">Sem horários disponíveis</p>}</div>; })}
      </section>)}
      </div>
    </section>
    <section aria-label="Duração da reserva" className={cx(surface,"tw:flex tw:flex-wrap tw:items-center tw:gap-3")}>
      <span className="tw:text-sm tw:font-medium">Duração</span>
      <div className="tw:flex tw:flex-wrap tw:gap-2">{allowedDurations.map(minutes=><button type="button" key={minutes} aria-pressed={durationMinutes===minutes} className={cx(slotButton,durationMinutes===minutes ? "tw:border-[#174983] tw:bg-[#174983] tw:text-white" : "tw:border-[#cad8e7] tw:bg-white tw:text-[#133047] tw:dark:border-[#3b4e66] tw:dark:bg-[#101c2d] tw:dark:text-[#eff3f8]")} onClick={()=>setDurationMinutes(minutes)}>{duration(minutes)}</button>)}</div>
      {selectedServices.some(service=>service.rules.minimumMinutes) ? <p className="tw:m-0 tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">Durações liberadas pelos serviços selecionados.</p> : null}
    </section>
    {services.length ? <section aria-label="Serviços opcionais da reserva" className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-700:grid-cols-1"><h2 className="tw:col-span-full tw:m-0 tw:text-xl tw:font-medium">Complete sua reserva</h2>{availableServices.map(service => {
      const checked=selectedServiceIds.includes(service.id);
      const details=service.conditions ?? serviceRuleDetails(service.rules,courts);
      return <article key={service.id} className={cx(surface,"tw:flex tw:min-w-0 tw:flex-col tw:gap-3",checked && "tw:border-[#174983] tw:ring-1 tw:ring-[#174983] tw:dark:border-[#9bc5ff] tw:dark:ring-[#9bc5ff]")}>
        <ToggleSwitch compact tone="blue" label={service.name} checked={checked} disabled={pending || (!checked && !service.compatible.length)} onCheckedChange={next=>toggleService(service.id,next,service.compatible)}/>
        <div><strong className="tw:text-xl tw:font-bold tw:tabular-nums tw:text-[#087443] tw:dark:text-[#6ee7b7]">{money(servicePriceCents(service.priceCents,Boolean(service.serviceHourly),durationMinutes))}</strong><span className="tw:ml-2 tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{service.serviceHourly ? `por ${duration(durationMinutes)} · ${money(service.priceCents)}/h` : "por reserva"}</span></div>
        <dl className="tw:m-0 tw:grid tw:gap-2 tw:text-xs tw:leading-relaxed">{details.map(detail=><div key={detail.label} className={detail.label === "Quadras" ? "tw:rounded-md tw:bg-[#e8f0fb] tw:px-2 tw:py-2 tw:text-[#174983] tw:dark:bg-[#213148] tw:dark:text-[#b9d8ff]" : "tw:grid tw:grid-cols-[auto_minmax(0,1fr)] tw:gap-3"}><dt className={detail.label === "Quadras" ? "tw:sr-only" : "tw:text-[#52677d] tw:dark:text-[#bdd9e6]"}>{detail.label}</dt><dd className={cx("tw:m-0 tw:min-w-0 tw:break-words",detail.label === "Quadras" && "tw:font-semibold")}>{detail.value}</dd></div>)}</dl>
        {service.rules.minimumMinutes ? <p className="tw:m-0 tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">Ao selecionar, reserve a partir de {duration(service.rules.minimumMinutes)}.</p> : null}
        <span className="tw:mt-auto tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{service.compatible.length ? service.available ? `${service.available} disponível(is)` : "Disponível para períodos menores" : "Indisponível nesta quadra ou período"}</span>
      </article>;
    })}</section> : null}
    </>}
    {serviceConflict ? <p role="alert" className="tw:text-sm tw:text-red-700 tw:dark:text-red-300">Confira os serviços selecionados: esta quadra, duração ou faixa de horário não está disponível.</p> : null}
    {selection.hasConflict ? <p className={viewStyles.public_booking_conflict} role="alert">Há uma reserva conflitando com este período. Escolha outro horário ou uma duração menor.</p> : null}
    {pendingNotice}
    {message ? <p role="status" className="tw:text-sm">{message}{calendarUrl ? <> <a href={calendarUrl}>Adicionar ao meu calendário</a></> : null}</p> : null}
    </div>
    <section aria-label="Resumo da reserva" className={cx(surface,"tw:sticky tw:top-5 tw:grid tw:min-w-0 tw:gap-4 tw:max-[1000px]:static")}>
      <header className="tw:grid tw:gap-2"><h2 className="tw:m-0 tw:text-xs tw:font-medium tw:uppercase tw:tracking-wider">Sua reserva</h2><time dateTime={startsAt.slice(0,10)} className="tw:text-lg tw:font-medium">{new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long"}).format(new Date(`${startsAt.slice(0,10)}T12:00:00`))}</time><p className="tw:m-0 tw:break-words tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">Reserva para {matchSummary?.title ?? currentClient.name}</p>{matchSummary ? <p className="tw:m-0 tw:break-words tw:text-xs">{matchSummary.athletes.join(' · ')}</p> : null}<p className="tw:m-0 tw:text-sm">{slot?.label} às {endLabel(startsAt,durationMinutes)} · {duration(durationMinutes)}</p></header>
      <ul className="tw:m-0 tw:grid tw:list-none tw:gap-3 tw:border-y tw:border-[#d8e5e9] tw:px-0 tw:py-4 tw:dark:border-[#293648]">{[{ id: courtId, name: `Quadra ${court?.name}`, priceCents: courtTotalCents, fixed: false }, ...selectedServices.map(service=>({id:service.id,name:service.name,priceCents:servicePriceCents(service.priceCents,Boolean(service.serviceHourly),durationMinutes),fixed:!service.serviceHourly}))].map(item=><li key={item.id} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_auto] tw:gap-2 tw:text-sm"><div className="tw:min-w-0 tw:break-words">{item.name}<small className="tw:block tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">{duration(durationMinutes)}{item.fixed ? " · valor fixo" : ""}</small></div><span className="tw:whitespace-nowrap tw:tabular-nums">{money(item.priceCents)}</span></li>)}</ul>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><span className="tw:text-sm">Valor total</span><output aria-label="Valor total da reserva" aria-live="polite" className="tw:text-2xl tw:font-bold tw:tabular-nums tw:text-[#087443]! tw:dark:text-[#6ee7b7]!">{money(selectedTotalCents)}</output></div>
      <button type="submit" className={cx(ui.primary,"tw:w-full tw:justify-center")} data-portal-action disabled={pending || selection.hasConflict || serviceConflict || bookingBlocked}>{bookingBlocked ? "Reserva indisponível" : pending ? "Enviando reserva…" : !reviewing ? "Revisar reserva" : requiresPayment ? "Ir para pagamento" : "Solicitar reserva"}</button>
      {reviewing ? <button type="button" className={ui.secondary} onClick={()=>setReviewing(false)}>Voltar à escolha</button> : <span className="tw:text-center tw:text-xs tw:text-[#52677d] tw:dark:text-[#bdd9e6]">Você revisa tudo antes de confirmar.</span>}
    </section>
    </div>
  </form>;
}
