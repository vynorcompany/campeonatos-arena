"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { cancelCourtBookingAction, createQuickPlayerAction, saveCourtBookingAction } from "@/lib/actions/calendar";
import { endMinutesForBookingStart } from "@/lib/calendar/booking-availability";
import { openBookingComandasAction } from "@/lib/actions/comanda";
import { OnlineBookingConfirmButton } from "@/components/online-booking-confirm-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";

type Player = { id: string; name: string };
type Court = { id: string; name: string };
type Teacher = { id: string; name: string };
type Participant = { playerId: string; amountCents: number; paymentMethod: string };
type AgendaSlot = { occurrenceId?: string; courtId: string; courtIds?: string[]; courtName: string; dateLabel: string; dateValue: string; startsAt: string; endsAt: string; state: "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED"; pendingConfirmation?: boolean; priceCents?: number; bookingTypeName?: string; notes?: string; teacherId?: string; participants?: Participant[] };

const paymentOptions = [["", "Em aberto"], ["PIX", "PIX"], ["CASH", "Dinheiro"], ["CREDIT_CARD", "Cartão de crédito"], ["DEBIT_CARD", "Cartão de débito"], ["CREDIT_BALANCE", "Saldo de crédito"], ["TRANSFER", "Transferência"]] as const;
function toCents(value: string) { const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."); return Math.max(0, Math.round((Number(normalized) || 0) * 100)); }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function startMinute(value: string) { return Number(value.slice(0, 2)) * 60 + Number(value.slice(3)); }
function isLessonType(value: string) { return ["aula", "aula fixa"].includes(value.trim().toLowerCase()); }
function isSuper12(value: string) { return value.trim().toLowerCase() === "super 12"; }

export function AgendaSlotDialog({ slot, players, courts, teachers, bookingTypes, children }: { slot: AgendaSlot; players: Player[]; courts: Court[]; teachers: Teacher[]; bookingTypes: string[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [playerOptions, setPlayerOptions] = useState(players);
  const [bookingTypeName, setBookingTypeName] = useState(slot.bookingTypeName ?? "Reserva");
  const [playerSearch, setPlayerSearch] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [dateValue, setDateValue] = useState(slot.dateValue);
  const [startsAt, setStartsAt] = useState(slot.startsAt);
  const [endsAt, setEndsAt] = useState(slot.endsAt);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [availableMinutes, setAvailableMinutes] = useState<number[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [notes, setNotes] = useState(slot.notes ?? "");
  const [teacherId, setTeacherId] = useState(slot.teacherId ?? "");
  const [courtIds, setCourtIds] = useState<string[]>(slot.courtIds?.length ? slot.courtIds : [slot.courtId]);
  const [participants, setParticipants] = useState<Participant[]>(() => slot.participants ?? []);
  const [courtPriceEditing, setCourtPriceEditing] = useState(false);
  const [courtAmountCents, setCourtAmountCents] = useState(slot.priceCents ?? (slot.participants ?? []).reduce((total, participant) => total + participant.amountCents, 0));
  const [error, setError] = useState("");
  const super12 = isSuper12(bookingTypeName);
  const lesson = isLessonType(bookingTypeName);
  const selectedParticipants = participants.filter((participant) => participant.playerId);
  const matchingPlayers = useMemo(() => playerOptions.filter((player) => player.name.toLowerCase().includes(playerSearch.toLowerCase()) && !selectedParticipants.some((participant) => participant.playerId === player.id)), [playerOptions, playerSearch, selectedParticipants]);
  const stateLabel = slot.state === "AVAILABLE" ? "Nova reserva" : slot.state === "OCCUPIED" ? "Editar reserva" : "Horário indisponível";
  const reservationName = super12 ? "Super 12" : `${playerOptions.find((player) => player.id === selectedParticipants[0]?.playerId)?.name ?? "Cliente"} - ${bookingTypeName}`;
  const primaryParticipantName = playerOptions.find((player) => player.id === selectedParticipants[0]?.playerId)?.name ?? reservationName;
  const selectedStartMinute = startMinute(startsAt);
  const selectedEndMinute = startMinute(endsAt);
  const endOptions = useMemo(() => endMinutesForBookingStart({ startMinute: selectedStartMinute, slotMinutes, availableMinutes }), [availableMinutes, selectedStartMinute, slotMinutes]);
  const canSaveTime = availabilityLoaded && availableMinutes.includes(selectedStartMinute) && endOptions.includes(selectedEndMinute);
  const setAmount = (amountCents: number) => { setCourtAmountCents(amountCents); if (super12) setParticipants((current) => current.map((participant) => participant.playerId ? { ...participant, amountCents } : participant)); };
  const addPlayerToReservation = (playerId: string) => { if (selectedParticipants.some((participant) => participant.playerId === playerId)) return; setParticipants((current) => [...current, { playerId, amountCents: super12 ? courtAmountCents : 0, paymentMethod: "" }]); setPlayerSearch(""); };
  const updateParticipant = (index: number, values: Partial<Participant>) => setParticipants((current) => current.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...values } : participant));
  const removeParticipant = (index: number) => setParticipants((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const toggleCourt = (courtId: string) => setCourtIds((current) => current.includes(courtId) ? current.filter((id) => id !== courtId) : [...current, courtId]);
  const splitEvenly = () => { if (!selectedParticipants.length) { setError("Selecione ao menos um atleta para dividir o valor."); return; } const part = Math.floor(courtAmountCents / selectedParticipants.length); const remainder = courtAmountCents % selectedParticipants.length; let position = 0; setParticipants((current) => current.map((participant) => !participant.playerId ? participant : { ...participant, amountCents: part + (position++ === selectedParticipants.length - 1 ? remainder : 0) })); };
  const selectStartTime = (nextStart: string) => { const previousDuration = Math.max(slotMinutes, selectedEndMinute - selectedStartMinute); const nextEndOptions = endMinutesForBookingStart({ startMinute: startMinute(nextStart), slotMinutes, availableMinutes }); const preferredEnd = startMinute(nextStart) + previousDuration; setStartsAt(nextStart); setEndsAt(minuteLabel(nextEndOptions.includes(preferredEnd) ? preferredEnd : nextEndOptions[0] ?? startMinute(nextStart) + slotMinutes)); };

  useEffect(() => {
    if (!open || slot.state === "UNAVAILABLE") return;
    const controller = new AbortController();
    setAvailabilityLoading(true); setAvailabilityLoaded(false);
    fetch(`/api/agenda/availability?courtId=${encodeURIComponent(slot.courtId)}&date=${encodeURIComponent(dateValue)}${slot.occurrenceId ? `&occurrenceId=${encodeURIComponent(slot.occurrenceId)}` : ""}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Não foi possível consultar a disponibilidade.")))
      .then((availability: { slotMinutes: number; availableMinutes: number[] }) => {
        setSlotMinutes(availability.slotMinutes); setAvailableMinutes(availability.availableMinutes);
        setStartsAt((currentStart) => { const nextStartMinute = availability.availableMinutes.includes(startMinute(currentStart)) ? startMinute(currentStart) : availability.availableMinutes[0]; if (nextStartMinute == null) return currentStart; const nextEndOptions = endMinutesForBookingStart({ startMinute: nextStartMinute, slotMinutes: availability.slotMinutes, availableMinutes: availability.availableMinutes }); setEndsAt((currentEnd) => nextEndOptions.includes(startMinute(currentEnd)) ? currentEnd : minuteLabel(nextEndOptions[0] ?? nextStartMinute + availability.slotMinutes)); return minuteLabel(nextStartMinute); });
        setAvailabilityLoaded(true);
      })
      .catch((reason: unknown) => { if (controller.signal.aborted) return; setAvailableMinutes([]); setError(reason instanceof Error ? reason.message : "Não foi possível consultar a disponibilidade."); setAvailabilityLoaded(true); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false); });
    return () => controller.abort();
  }, [dateValue, open, slot.courtId, slot.occurrenceId, slot.state]);

  useEffect(() => { const closeWithEscape = (event: KeyboardEvent) => { if (event.key !== "Escape") return; if (quickCreateOpen) { setQuickCreateOpen(false); return; } if (optionsOpen) { setOptionsOpen(false); return; } if (open) setOpen(false); }; window.addEventListener("keydown", closeWithEscape); return () => window.removeEventListener("keydown", closeWithEscape); }, [open, optionsOpen, quickCreateOpen]);
  useEffect(() => { const closeOptionsOutside = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest(".agenda-slot-options")) setOptionsOpen(false); }; document.addEventListener("mousedown", closeOptionsOutside); return () => document.removeEventListener("mousedown", closeOptionsOutside); }, []);

  const submit = () => {
    setError("");
    if (!canSaveTime) { setError("Selecione um período disponível para esta quadra."); return; }
    if (super12 && !courtIds.length) { setError("Selecione ao menos uma quadra para o Super 12."); return; }
    if (lesson && !teacherId) { setError("Selecione o professor responsável."); return; }
    const formData = new FormData(); if (slot.occurrenceId) formData.set("occurrenceId", slot.occurrenceId);
    formData.set("courtId", slot.courtId); formData.set("courtIds", JSON.stringify(super12 ? courtIds : [slot.courtId])); formData.set("title", reservationName); formData.set("startsAt", `${dateValue}T${startsAt}`); formData.set("durationMinutes", String(selectedEndMinute - selectedStartMinute)); formData.set("bookingTypeName", bookingTypeName); formData.set("teacherId", lesson ? teacherId : ""); formData.set("notes", notes); formData.set("participants", JSON.stringify(selectedParticipants));
    startTransition(async () => { try { const result = await saveCourtBookingAction(formData); if (result.error) { setError(result.error); return; } setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o agendamento."); } });
  };
  const cancelBooking = (mode: "CANCEL" | "FREE") => { if (!slot.occurrenceId) return; setError(""); const formData = new FormData(); formData.set("occurrenceId", slot.occurrenceId); formData.set("mode", mode); startTransition(async () => { try { await cancelCourtBookingAction(formData); setOptionsOpen(false); setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cancelar o horário."); } }); };
  const openComandasForParticipants = () => { if (!slot.occurrenceId) return; setError(""); const formData = new FormData(); formData.set("occurrenceId", slot.occurrenceId); startTransition(async () => { try { await openBookingComandasAction(formData); setOptionsOpen(false); router.push("/comandas"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir as comandas."); } }); };

  return <>
    <div className="agenda-slot-entry"><button type="button" className="agenda-slot-trigger" onClick={() => setOpen(true)}>{children}</button>{slot.state === "OCCUPIED" && slot.occurrenceId ? <div className="agenda-slot-options"><button type="button" className="agenda-slot-options-trigger" aria-label="Mais opções do horário" title="Mais opções" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((current) => !current)}><span aria-hidden="true">⋮</span></button>{optionsOpen ? <div className="agenda-slot-options-menu"><button type="button" className="agenda-slot-option-cancel" onClick={() => cancelBooking("CANCEL")}>Cancelar horário</button><button type="button" className="agenda-slot-option-free" onClick={() => cancelBooking("FREE")}>Liberar horário</button></div> : null}</div> : null}</div>
    {open ? <div className="agenda-slot-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="agenda-slot-dialog agenda-booking-dialog" role="dialog" aria-modal="true" aria-label="Agendamento de horário" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">{stateLabel}</p><h2>{reservationName}</h2><span>{slot.dateLabel} · {startsAt} às {endsAt}</span>{slot.state === "OCCUPIED" && slot.occurrenceId ? <div className="agenda-reservation-client"><strong>{primaryParticipantName}</strong><button type="button" className="agenda-open-comandas-button" onClick={openComandasForParticipants} disabled={pending}>Abrir comandas dos atletas</button>{slot.pendingConfirmation ? <OnlineBookingConfirmButton occurrenceId={slot.occurrenceId} /> : null}</div> : null}</div><button className="button" type="button" onClick={() => setOpen(false)}>Fechar</button></header>
      {slot.state === "UNAVAILABLE" ? <p className="form-note">Este horário está bloqueado pela configuração da quadra.</p> : <div className="agenda-booking-form">
        <div className="agenda-booking-summary-grid">
          <section className="agenda-booking-summary-card"><span>QUADRA</span><strong>{slot.courtName}</strong></section>
          <section className="agenda-booking-summary-card"><span>TIPO DA RESERVA</span><select aria-label="Tipo da reserva" value={bookingTypeName} onChange={(event) => setBookingTypeName(event.target.value)}>{bookingTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></section>
          <section className="agenda-booking-summary-card"><span>{super12 ? "VALOR POR ATLETA" : "VALOR DA QUADRA"}</span>{courtPriceEditing ? <MoneyInput valueCents={courtAmountCents} onValueCentsChange={setAmount} onBlur={() => setCourtPriceEditing(false)} autoFocus /> : <button type="button" className="agenda-price-editor" onClick={() => setCourtPriceEditing(true)}>R$ {formatMoneyInput(courtAmountCents)}</button>}{!super12 ? <button type="button" className="agenda-split-button" onClick={splitEvenly}>Dividir igualmente</button> : null}</section>
          <section className="agenda-booking-summary-card agenda-booking-datetime-card"><span>DATA E HORÁRIO</span><div><label>Data<input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} /></label><label>Horário de início<select value={startsAt} onChange={(event) => selectStartTime(event.target.value)} disabled={availabilityLoading || !availableMinutes.length}>{availableMinutes.map((minute) => <option value={minuteLabel(minute)} key={minute}>{minuteLabel(minute)}</option>)}</select></label><label>Horário de término<select value={endsAt} onChange={(event) => setEndsAt(event.target.value)} disabled={availabilityLoading || !endOptions.length}>{endOptions.map((minute) => <option value={minuteLabel(minute)} key={minute}>{minuteLabel(minute)}</option>)}</select></label></div>{availabilityLoading ? <small>Consultando disponibilidade…</small> : availabilityLoaded && !availableMinutes.length ? <small>Sem horários disponíveis nesta data.</small> : null}</section>
        </div>
        {lesson ? <label className="agenda-booking-extra">Professor responsável<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required><option value="">Selecione o professor</option>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}</select></label> : null}
        {super12 ? <section className="agenda-super12-courts"><strong>Quadras do Super 12</strong><div>{courts.map((court) => <label key={court.id}><input type="checkbox" checked={courtIds.includes(court.id)} onChange={() => toggleCourt(court.id)} />{court.name}</label>)}</div></section> : null}
        <section className="agenda-participants"><div className="agenda-client-search"><label>Buscar cliente<input placeholder="Digite o nome do cliente" value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} /></label>{playerSearch.trim() && !matchingPlayers.length ? <button type="button" className="button" onClick={() => { setQuickName(playerSearch); setQuickCreateOpen(true); }}>Cadastrar cliente</button> : null}{playerSearch.trim() && matchingPlayers.length ? <div className="agenda-player-suggestions">{matchingPlayers.slice(0, 8).map((player) => <button type="button" key={player.id} onClick={() => addPlayerToReservation(player.id)}>{player.name}</button>)}</div> : null}</div><div className="agenda-participant-list">{selectedParticipants.length ? selectedParticipants.map((participant) => { const index = participants.findIndex((item) => item.playerId === participant.playerId); return <div className="agenda-participant-row" key={participant.playerId}><strong>{playerOptions.find((player) => player.id === participant.playerId)?.name}</strong><label>Valor<input inputMode="decimal" value={formatMoneyInput(participant.amountCents)} onChange={(event) => updateParticipant(index, { amountCents: toCents(event.target.value) })} /></label><label>Forma de pagamento<select value={participant.paymentMethod} onChange={(event) => updateParticipant(index, { paymentMethod: event.target.value })}>{paymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="button button-danger" onClick={() => removeParticipant(index)}>Remover atleta</button></div>; }) : <p>Nenhum atleta inserido.</p>}</div></section>
        <label className="agenda-booking-extra">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {error ? <p className="form-error">{error}</p> : null}<footer>{slot.state === "OCCUPIED" && slot.occurrenceId ? <button type="button" className="button button-danger" onClick={() => cancelBooking("CANCEL")} disabled={pending}>Cancelar horário</button> : null}<button type="button" className="button" onClick={() => setOpen(false)}>Fechar</button><button type="button" className="button button-primary" onClick={submit} disabled={pending || !canSaveTime}>{pending ? "Salvando…" : "Salvar agendamento"}</button></footer>
      </div>}
    </section>{quickCreateOpen ? <div className="agenda-quick-player"><h3>Novo cliente</h3><label>Nome<input value={quickName} onChange={(event) => setQuickName(event.target.value)} /></label><label>Telefone<input value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} /></label><div><button type="button" className="button" onClick={() => setQuickCreateOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => { const data = new FormData(); data.set("name", quickName); data.set("phone", quickPhone); startTransition(async () => { try { const player = await createQuickPlayerAction(data); setPlayerOptions((current) => [...current, player]); addPlayerToReservation(player.id); setQuickCreateOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar cliente."); } }); }}>Salvar cliente</button></div></div> : null}</div> : null}
  </>;
}
