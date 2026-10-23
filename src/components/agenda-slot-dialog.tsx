"use client";
import { viewStyles } from "./agenda-slot-dialog.utilities";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { cancelCourtBookingAction, createQuickPlayerAction, saveCourtBookingAction } from "@/lib/actions/calendar";
import { durationMinutesForBookingStart } from "@/lib/calendar/booking-availability";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";
import { standardServiceCode, type StandardServicePrices } from "@/lib/calendar/standard-services";
import { openBookingComandasAction } from "@/lib/actions/comanda";
import { OnlineBookingConfirmButton } from "@/components/online-booking-confirm-button";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";

type Player = { id: string; name: string };
type Court = { id: string; name: string };
type Teacher = { id: string; name: string };
type Participant = { playerId: string; amountCents: number; paymentMethod: string; checkedInAt?: string | null };
type CourtPricingRule = { weekday: number; startsAtMinute: number; endsAtMinute: number; priceCents: number; available: boolean };
type AgendaSlot = { occurrenceId?: string; sourceType?: string; courtId: string; courtIds?: string[]; courtName: string; dateLabel: string; dateValue: string; startsAt: string; endsAt: string; state: "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED"; pendingConfirmation?: boolean; priceCents?: number; pricingRules?: CourtPricingRule[]; bookingTypeName?: string; notes?: string; teacherId?: string; responsiblePlayerId?: string; participants?: Participant[] };

const paymentOptions = [["", "Em aberto"], ["PIX", "PIX"], ["CASH", "Dinheiro"], ["CREDIT_CARD", "Cartão de crédito"], ["DEBIT_CARD", "Cartão de débito"], ["CREDIT_BALANCE", "Saldo de crédito"], ["TRANSFER", "Transferência"]] as const;
function minuteLabel(value: number) { return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function startMinute(value: string) { return Number(value.slice(0, 2)) * 60 + Number(value.slice(3)); }
function durationLabel(value: number) { const hours = Math.floor(value / 60); const minutes = value % 60; return hours ? `${hours}h${minutes ? ` ${minutes}min` : ""}` : `${minutes} min`; }
function isLessonType(value: string) { return ["aula", "aula fixa"].includes(value.trim().toLowerCase()); }
function isFixedBooking(value: string) { return ["aula fixa", "reserva fixa"].includes(value.trim().toLowerCase()); }
function isSuper12(value: string) { return value.trim().toLowerCase() === "super 12"; }

export function AgendaSlotDialog({ slot, players, courts, teachers, bookingTypes, servicePrices = {}, canCreateBooking, canEditBooking, canCancelBooking, canReleaseBooking, canOpenComandas, canCreatePlayer, children }: { slot: AgendaSlot; players: Player[]; courts: Court[]; teachers: Teacher[]; bookingTypes: string[]; servicePrices?: StandardServicePrices; canCreateBooking: boolean; canEditBooking: boolean; canCancelBooking: boolean; canReleaseBooking: boolean; canOpenComandas: boolean; canCreatePlayer: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [cancelMode, setCancelMode] = useState<"CANCEL" | "FREE" | null>(null);
  const [cancelOpenCharges, setCancelOpenCharges] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [playerOptions, setPlayerOptions] = useState(players);
  const [bookingTypeName, setBookingTypeName] = useState(slot.bookingTypeName ?? "Reserva");
  const [playerSearch, setPlayerSearch] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [dateValue, setDateValue] = useState(slot.dateValue);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [startsAt, setStartsAt] = useState(slot.startsAt);
  const [durationMinutes, setDurationMinutes] = useState(() => Math.max(15, startMinute(slot.endsAt) - startMinute(slot.startsAt)));
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [availableMinutes, setAvailableMinutes] = useState<number[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [notes, setNotes] = useState(slot.notes ?? "");
  const [teacherId, setTeacherId] = useState(slot.teacherId ?? "");
  const [responsiblePlayerId, setResponsiblePlayerId] = useState(slot.responsiblePlayerId ?? "");
  const [courtIds, setCourtIds] = useState<string[]>(slot.courtIds?.length ? slot.courtIds : [slot.courtId]);
  const [participants, setParticipants] = useState<Participant[]>(() => slot.participants ?? []);
  const [courtPriceEditing, setCourtPriceEditing] = useState(false);
  const [courtAmountCents, setCourtAmountCents] = useState(() => standardServiceCode(slot.bookingTypeName ?? "") ? slot.participants?.[0]?.amountCents ?? servicePrices[standardServiceCode(slot.bookingTypeName ?? "")!] ?? 0 : slot.priceCents ?? (slot.participants ?? []).reduce((total, participant) => total + participant.amountCents, 0));
  const [error, setError] = useState("");
  const super12 = isSuper12(bookingTypeName);
  const serviceCode = standardServiceCode(bookingTypeName);
  const perAthlete = Boolean(serviceCode);
  const lesson = isLessonType(bookingTypeName);
  const fixedBooking = isFixedBooking(bookingTypeName);
  const selectedParticipants = participants.filter((participant) => participant.playerId);
  const matchingPlayers = useMemo(() => playerOptions.filter((player) => player.name.toLowerCase().includes(playerSearch.toLowerCase()) && !selectedParticipants.some((participant) => participant.playerId === player.id)), [playerOptions, playerSearch, selectedParticipants]);
  const stateLabel = slot.state === "AVAILABLE" ? "Nova reserva" : slot.state === "OCCUPIED" ? (canEditBooking ? "Editar reserva" : "Ver reserva") : "Horário indisponível";
  const canSaveBooking = slot.occurrenceId ? canEditBooking : canCreateBooking;
  const reservationName = super12 ? "Super 12" : `${bookingTypeName} · ${playerOptions.find((player) => player.id === selectedParticipants[0]?.playerId)?.name ?? "Cliente"}`;
  const primaryParticipantName = playerOptions.find((player) => player.id === selectedParticipants[0]?.playerId)?.name ?? reservationName;
  const selectedStartMinute = startMinute(startsAt);
  const selectedEndMinute = selectedStartMinute + durationMinutes;
  const endsAt = minuteLabel(selectedEndMinute);
  const durationOptions = useMemo(() => durationMinutesForBookingStart({ startMinute: selectedStartMinute, slotMinutes, availableMinutes }), [availableMinutes, selectedStartMinute, slotMinutes]);
  const canSaveTime = availabilityLoaded && availableMinutes.includes(selectedStartMinute) && durationOptions.includes(durationMinutes);
  const automaticCourtAmount = (nextStart: string, nextDuration: number) => calculateCourtIntervalPrice({
    startsAtMinute: startMinute(nextStart),
    durationMinutes: nextDuration,
    intervalMinutes: slotMinutes,
    weekday: new Date(`${dateValue}T12:00:00`).getDay(),
    rules: slot.pricingRules ?? [],
  });
  const selectBookingType = (nextType: string) => { setBookingTypeName(nextType); const nextCode = standardServiceCode(nextType); if (nextCode) { const amountCents = servicePrices[nextCode] ?? 0; setCourtAmountCents(amountCents); setParticipants((current) => current.map((participant) => ({ ...participant, amountCents }))); } };
  const setAmount = (amountCents: number) => { setCourtAmountCents(amountCents); if (perAthlete) setParticipants((current) => current.map((participant) => participant.playerId ? { ...participant, amountCents } : participant)); };
  const addPlayerToReservation = (playerId: string) => { if (selectedParticipants.some((participant) => participant.playerId === playerId)) return; setParticipants((current) => [...current, { playerId, amountCents: perAthlete ? courtAmountCents : 0, paymentMethod: "" }]); if (!responsiblePlayerId) setResponsiblePlayerId(playerId); setPlayerSearch(""); };
  const updateParticipant = (index: number, values: Partial<Participant>) => setParticipants((current) => current.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...values } : participant));
  const removeParticipant = (index: number) => { const remaining = participants.filter((_, itemIndex) => itemIndex !== index); if (participants[index]?.playerId === responsiblePlayerId) setResponsiblePlayerId(remaining.find(participant => participant.playerId)?.playerId ?? ""); setParticipants(remaining); };
  const toggleCourt = (courtId: string) => setCourtIds((current) => current.includes(courtId) ? current.filter((id) => id !== courtId) : [...current, courtId]);
  const splitEvenly = () => { if (!selectedParticipants.length) { setError("Selecione ao menos um atleta para dividir o valor."); return; } const part = Math.floor(courtAmountCents / selectedParticipants.length); const remainder = courtAmountCents % selectedParticipants.length; let position = 0; setParticipants((current) => current.map((participant) => !participant.playerId ? participant : { ...participant, amountCents: part + (position++ === selectedParticipants.length - 1 ? remainder : 0) })); };
  const selectStartTime = (nextStart: string) => { const nextDurationOptions = durationMinutesForBookingStart({ startMinute: startMinute(nextStart), slotMinutes, availableMinutes }); const nextDuration = nextDurationOptions.includes(durationMinutes) ? durationMinutes : nextDurationOptions[0] ?? slotMinutes; setStartsAt(nextStart); setDurationMinutes(nextDuration); if (!perAthlete) { const nextAmount = automaticCourtAmount(nextStart, nextDuration); if (nextAmount !== null) setCourtAmountCents(nextAmount); } };
  const selectDuration = (nextDuration: number) => { setDurationMinutes(nextDuration); if (!perAthlete) { const nextAmount = automaticCourtAmount(startsAt, nextDuration); if (nextAmount !== null) setCourtAmountCents(nextAmount); } };

  useEffect(() => {
    if (!open || slot.state === "UNAVAILABLE") return;
    const controller = new AbortController();
    setAvailabilityLoading(true); setAvailabilityLoaded(false);
    fetch(`/api/agenda/availability?courtId=${encodeURIComponent(slot.courtId)}&date=${encodeURIComponent(dateValue)}${slot.occurrenceId ? `&occurrenceId=${encodeURIComponent(slot.occurrenceId)}` : ""}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Não foi possível consultar a disponibilidade.")))
      .then((availability: { slotMinutes: number; availableMinutes: number[] }) => {
        setSlotMinutes(availability.slotMinutes); setAvailableMinutes(availability.availableMinutes);
        setStartsAt((currentStart) => { const nextStartMinute = availability.availableMinutes.includes(startMinute(currentStart)) ? startMinute(currentStart) : availability.availableMinutes[0]; if (nextStartMinute == null) return currentStart; const nextDurationOptions = durationMinutesForBookingStart({ startMinute: nextStartMinute, slotMinutes: availability.slotMinutes, availableMinutes: availability.availableMinutes }); setDurationMinutes((currentDuration) => nextDurationOptions.includes(currentDuration) ? currentDuration : nextDurationOptions[0] ?? availability.slotMinutes); return minuteLabel(nextStartMinute); });
        setAvailabilityLoaded(true);
      })
      .catch((reason: unknown) => { if (controller.signal.aborted) return; setAvailableMinutes([]); setError(reason instanceof Error ? reason.message : "Não foi possível consultar a disponibilidade."); setAvailabilityLoaded(true); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false); });
    return () => controller.abort();
  }, [dateValue, open, slot.courtId, slot.occurrenceId, slot.state]);

  useEffect(() => {
    if (!open || perAthlete || courtPriceEditing) return;
    const nextAmount = automaticCourtAmount(startsAt, durationMinutes);
    if (nextAmount !== null) setCourtAmountCents((current) => current === nextAmount ? current : nextAmount);
  }, [dateValue, durationMinutes, open, slot.state, slotMinutes, startsAt, perAthlete]);

  useEffect(() => { const closeWithEscape = (event: KeyboardEvent) => { if (event.key !== "Escape") return; if (cancelMode) { setCancelMode(null); return; } if (quickCreateOpen) { setQuickCreateOpen(false); return; } if (optionsOpen) { setOptionsOpen(false); return; } if (open) setOpen(false); }; window.addEventListener("keydown", closeWithEscape); return () => window.removeEventListener("keydown", closeWithEscape); }, [cancelMode, open, optionsOpen, quickCreateOpen]);
  useEffect(() => { const closeOptionsOutside = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest(".agenda-slot-options")) setOptionsOpen(false); }; document.addEventListener("mousedown", closeOptionsOutside); return () => document.removeEventListener("mousedown", closeOptionsOutside); }, []);

  const submit = () => {
    setError("");
    if (!canSaveTime) { setError("Selecione um período disponível para esta quadra."); return; }
    if (!selectedParticipants.length) { setError("Selecione pelo menos um cliente antes de salvar a reserva."); return; }
    if (!slot.occurrenceId && serviceCode && servicePrices[serviceCode] === undefined) { setError(`Configure o valor de ${bookingTypeName} em Produtos e Serviços → Serviços antes de criar o horário.`); return; }
    if (super12 && !courtIds.length) { setError("Selecione ao menos uma quadra para o Super 12."); return; }
    if (lesson && !teacherId) { setError("Selecione o professor responsável."); return; }
    const formData = new FormData(); if (slot.occurrenceId) formData.set("occurrenceId", slot.occurrenceId);
    formData.set("courtId", slot.courtId); formData.set("courtIds", JSON.stringify(super12 ? courtIds : [slot.courtId])); formData.set("title", reservationName); formData.set("startsAt", `${dateValue}T${startsAt}`); formData.set("durationMinutes", String(selectedEndMinute - selectedStartMinute)); formData.set("bookingTypeName", bookingTypeName); formData.set("repeatUntil", fixedBooking ? repeatUntil : ""); formData.set("teacherId", lesson ? teacherId : ""); formData.set("responsiblePlayerId", responsiblePlayerId || selectedParticipants[0]?.playerId || ""); formData.set("notes", notes); formData.set("participants", JSON.stringify(selectedParticipants));
    startTransition(async () => { try { const result = await saveCourtBookingAction(formData); if (result.error) { setError(result.error); return; } setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o agendamento."); } });
  };
  const requestCancellation = (mode: "CANCEL" | "FREE") => { if (mode === "CANCEL" ? !canCancelBooking : !canReleaseBooking) return; setError(""); setOptionsOpen(false); setCancelOpenCharges(false); setCancelMode(mode); };
  const cancelBooking = () => { if (!slot.occurrenceId || !cancelMode) return; setError(""); const formData = new FormData(); formData.set("occurrenceId", slot.occurrenceId); formData.set("mode", cancelMode); formData.set("cancelOpenCharges", cancelOpenCharges ? "yes" : "no"); startTransition(async () => { try { await cancelCourtBookingAction(formData); setCancelMode(null); setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cancelar o horário."); } }); };
  const openComandasForParticipants = () => { if (!slot.occurrenceId) return; setError(""); if (!selectedParticipants.length) { setError("Não é possível abrir comandas: esta reserva não possui cliente atribuído."); return; } const formData = new FormData(); formData.set("occurrenceId", slot.occurrenceId); startTransition(async () => { try { const result = await openBookingComandasAction(formData); if (result.error) { setError(result.error); return; } setOptionsOpen(false); router.push("/comandas"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir as comandas."); } }); };

  return <>
    <div className={viewStyles.agenda_slot_entry}><button type="button" className={viewStyles.agenda_slot_trigger} onClick={() => setOpen(true)}>{children}</button>{slot.state === "OCCUPIED" && slot.occurrenceId && (canCancelBooking || canReleaseBooking) ? <div className={viewStyles.agenda_slot_options}><button type="button" className={viewStyles.agenda_slot_options_trigger} aria-label="Ações da reserva" title="Ações da reserva" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((current) => !current)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h8m4 0h4M4 17h4m4 0h8M12 4v6m0 4v6" /></svg></button>{optionsOpen ? <div className={viewStyles.agenda_slot_options_menu}>{canCancelBooking ? <button type="button" className="agenda-slot-option-cancel" onClick={() => requestCancellation("CANCEL")}>Cancelar reserva</button> : null}{canReleaseBooking ? <button type="button" className="agenda-slot-option-free" onClick={() => requestCancellation("FREE")}>Liberar este horário</button> : null}</div> : null}</div> : null}</div>
    {open ? <div className={viewStyles.agenda_slot_backdrop} role="presentation" onMouseDown={() => setOpen(false)}><section className={viewStyles.agenda_slot_dialog_agenda_booking_dialog} role="dialog" aria-modal="true" aria-label="Agendamento de horário" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className={viewStyles.eyebrow}>{stateLabel}</p><h2>{reservationName}</h2><span>{slot.dateLabel} · {startsAt} às {endsAt}</span>{slot.state === "OCCUPIED" && slot.occurrenceId ? <div className={viewStyles.agenda_reservation_client}><strong>{primaryParticipantName}</strong>{canOpenComandas ? <button type="button" className={viewStyles.agenda_open_comandas_button} onClick={openComandasForParticipants} disabled={pending}>Abrir comandas dos atletas</button> : null}{slot.pendingConfirmation && canEditBooking ? <OnlineBookingConfirmButton occurrenceId={slot.occurrenceId} /> : null}</div> : null}</div><button className={viewStyles.button} type="button" onClick={() => setOpen(false)}>Fechar</button></header>
      {slot.state === "UNAVAILABLE" ? <p className="form-note">Este horário está bloqueado pela configuração da quadra.</p> : !canSaveBooking ? <div className="tw:grid tw:gap-3 tw:p-5 tw:text-sm tw:text-[var(--ink)] tw:sm:grid-cols-2 tw:sm:p-6"><p className="tw:m-0"><span className="tw:block tw:text-xs tw:uppercase tw:text-[var(--muted)]">Quadra</span>{slot.courtName}</p><p className="tw:m-0"><span className="tw:block tw:text-xs tw:uppercase tw:text-[var(--muted)]">Tipo</span>{bookingTypeName}</p><p className="tw:m-0"><span className="tw:block tw:text-xs tw:uppercase tw:text-[var(--muted)]">Data e horário</span>{slot.dateLabel} · {startsAt} às {endsAt}</p><p className="tw:m-0"><span className="tw:block tw:text-xs tw:uppercase tw:text-[var(--muted)]">Atletas</span>{selectedParticipants.map((participant) => playerOptions.find((player) => player.id === participant.playerId)?.name).filter(Boolean).join(", ") || "Não informados"}</p>{notes ? <p className="tw:m-0 tw:sm:col-span-2"><span className="tw:block tw:text-xs tw:uppercase tw:text-[var(--muted)]">Observações</span>{notes}</p> : null}</div> : <div className={viewStyles.agenda_booking_form}>
        <div className={viewStyles.agenda_booking_summary_grid}>
          <section className={viewStyles.agenda_booking_summary_card}><span>QUADRA</span><strong>{slot.courtName}</strong></section>
          <section className={viewStyles.agenda_booking_summary_card}><span>TIPO DA RESERVA</span><select aria-label="Tipo da reserva" value={bookingTypeName} onChange={(event) => selectBookingType(event.target.value)}>{bookingTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></section>
          <section className={viewStyles.agenda_booking_summary_card}><span>{perAthlete ? "VALOR POR ATLETA" : "VALOR DA QUADRA"}</span>{courtPriceEditing ? <MoneyInput valueCents={courtAmountCents} onValueCentsChange={setAmount} onBlur={() => setCourtPriceEditing(false)} autoFocus /> : <button type="button" className={viewStyles.agenda_price_editor} onClick={() => setCourtPriceEditing(true)}>R$ {formatMoneyInput(courtAmountCents)}</button>}{!perAthlete ? <button type="button" className={viewStyles.agenda_split_button} onClick={splitEvenly}>Dividir igualmente</button> : null}</section>
          <section className={viewStyles.agenda_booking_summary_card_agenda_booking_datetime_card}><span>DATA E HORÁRIO</span><div><label>Data<input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} /></label><label>Horário de início<select value={startsAt} onChange={(event) => selectStartTime(event.target.value)} disabled={availabilityLoading || !availableMinutes.length}>{availableMinutes.map((minute) => <option value={minuteLabel(minute)} key={minute}>{minuteLabel(minute)}</option>)}</select></label><label>Duração<select value={durationMinutes} onChange={(event) => selectDuration(Number(event.target.value))} disabled={availabilityLoading || !durationOptions.length}>{durationOptions.map((duration) => <option value={duration} key={duration}>{durationLabel(duration)}</option>)}</select></label></div>{availabilityLoading ? <small>Consultando disponibilidade…</small> : availabilityLoaded && !availableMinutes.length ? <small>Sem horários disponíveis nesta data.</small> : null}</section>
        </div>
        {fixedBooking && !slot.occurrenceId ? <label className={viewStyles.agenda_booking_extra}>Repetir semanalmente até<input type="date" min={dateValue} value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} required /></label> : null}
        <label className={viewStyles.agenda_booking_extra}>Responsável pela reserva<select value={responsiblePlayerId || selectedParticipants[0]?.playerId || ""} onChange={(event) => setResponsiblePlayerId(event.target.value)} required><option value="" disabled>Selecione um participante</option>{selectedParticipants.map((participant) => <option value={participant.playerId} key={participant.playerId}>{playerOptions.find((player) => player.id === participant.playerId)?.name ?? "Participante"}</option>)}</select><small>Identifica quem responde pela reserva. Em reservas fixas, recebe avisos de saldo em aberto.</small></label>
        {lesson ? <label className={viewStyles.agenda_booking_extra}>Professor responsável<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required><option value="">Selecione o professor</option>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}</select></label> : null}
        {super12 ? <section className={viewStyles.agenda_super12_courts}><strong>Quadras do Super 12</strong><div>{courts.map((court) => <label key={court.id}><input type="checkbox" checked={courtIds.includes(court.id)} onChange={() => toggleCourt(court.id)} />{court.name}</label>)}</div></section> : null}
        <section className={viewStyles.agenda_participants}><div className={viewStyles.agenda_client_search}><label>Buscar cliente<input placeholder="Digite o nome do cliente" value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} /></label>{canCreatePlayer && playerSearch.trim() && !matchingPlayers.length ? <button type="button" className={viewStyles.button} onClick={() => { setQuickName(playerSearch); setQuickCreateOpen(true); }}>Cadastrar cliente</button> : null}{playerSearch.trim() && matchingPlayers.length ? <div className={viewStyles.agenda_player_suggestions}>{matchingPlayers.slice(0, 8).map((player) => <button type="button" key={player.id} onClick={() => addPlayerToReservation(player.id)}>{player.name}</button>)}</div> : null}</div><div className={viewStyles.agenda_participant_list}>{selectedParticipants.length ? selectedParticipants.map((participant) => { const index = participants.findIndex((item) => item.playerId === participant.playerId); return <div className={viewStyles.agenda_participant_row} key={participant.playerId}><strong>{playerOptions.find((player) => player.id === participant.playerId)?.name}{participant.checkedInAt ? <small className="tw:mt-1 tw:block tw:text-xs tw:font-medium tw:text-[#078f7c]">✓ Check-in às {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(participant.checkedInAt))}</small> : null}</strong><label>Valor<MoneyInput valueCents={participant.amountCents} onValueCentsChange={(amountCents) => updateParticipant(index, { amountCents })} /></label><label>Forma de pagamento<select value={participant.paymentMethod} onChange={(event) => updateParticipant(index, { paymentMethod: event.target.value })}>{paymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className={viewStyles.button_button_danger} onClick={() => removeParticipant(index)}>Remover atleta</button></div>; }) : <p>Nenhum atleta inserido.</p>}</div></section>
        <label className={viewStyles.agenda_booking_extra}>Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {error && !cancelMode ? <p className={viewStyles.form_error}>{error}</p> : null}<footer>{slot.state === "OCCUPIED" && slot.occurrenceId && canCancelBooking ? <button type="button" className={viewStyles.button_button_danger} onClick={() => requestCancellation("CANCEL")} disabled={pending}>Cancelar reserva</button> : null}<button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Fechar</button>{canSaveBooking ? <button type="button" className={viewStyles.button_button_primary} onClick={submit} disabled={pending || !canSaveTime}>{pending ? "Salvando…" : "Salvar agendamento"}</button> : null}</footer>
      </div>}
    </section>{quickCreateOpen ? <div className={viewStyles.agenda_quick_player}><h3>Novo cliente</h3><label>Nome<input value={quickName} onChange={(event) => setQuickName(event.target.value)} /></label><label>Telefone<input value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} /></label><div><button type="button" className={viewStyles.button} onClick={() => setQuickCreateOpen(false)}>Cancelar</button><button type="button" className={viewStyles.button_button_primary} onClick={() => { const data = new FormData(); data.set("name", quickName); data.set("phone", quickPhone); startTransition(async () => { try { const player = await createQuickPlayerAction(data); setPlayerOptions((current) => [...current, player]); addPlayerToReservation(player.id); setQuickCreateOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar cliente."); } }); }}>Salvar cliente</button></div></div> : null}</div> : null}
    {cancelMode ? <div className="tw:fixed tw:inset-0 tw:z-[100] tw:grid tw:place-items-center tw:bg-slate-950/55 tw:p-3" role="presentation" onMouseDown={() => !pending && setCancelMode(null)}><section role="dialog" aria-modal="true" aria-label="Cancelar reserva e cobranças" className="tw:w-full tw:max-w-[480px] tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5 tw:text-[var(--ink)] tw:shadow-2xl tw:sm:p-6" onMouseDown={(event) => event.stopPropagation()}><h2 className="tw:m-0 tw:text-lg tw:font-semibold">{cancelMode === "FREE" ? "Liberar este horário" : "Cancelar reserva"}</h2><p className="tw:mt-2 tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">{cancelMode === "FREE" ? "Somente este horário será liberado." : "Esta reserva será cancelada; se for recorrente, os próximos horários também."} O que deseja fazer com as cobranças em aberto vinculadas?</p><fieldset className="tw:mt-4 tw:grid tw:gap-2 tw:border-0 tw:p-0"><legend className="tw:sr-only">Cobranças em aberto</legend><label className="tw:flex tw:items-start tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:p-3 tw:text-sm"><input type="radio" name="booking-cancel-charge" checked={!cancelOpenCharges} onChange={() => setCancelOpenCharges(false)} className="tw:mt-1" /><span className="tw:!text-sm tw:!font-medium tw:!normal-case">Manter cobranças em aberto</span></label><label className="tw:flex tw:items-start tw:gap-3 tw:rounded-lg tw:border tw:border-[var(--line)] tw:p-3 tw:text-sm"><input type="radio" name="booking-cancel-charge" checked={cancelOpenCharges} onChange={() => setCancelOpenCharges(true)} className="tw:mt-1" /><span className="tw:!text-sm tw:!font-medium tw:!normal-case">Cancelar cobranças em aberto <small className="tw:block tw:mt-1 tw:text-[var(--muted)]">Pagamentos já realizados serão preservados.</small></span></label></fieldset>{error ? <p role="alert" className="tw:mt-3 tw:text-sm tw:text-red-600">{error}</p> : null}<div className="tw:mt-5 tw:flex tw:flex-wrap tw:justify-end tw:gap-2"><button type="button" className={viewStyles.button} onClick={() => setCancelMode(null)} disabled={pending}>Voltar</button><button type="button" className={viewStyles.button_button_danger} onClick={cancelBooking} disabled={pending}>{pending ? "Cancelando…" : "Confirmar cancelamento"}</button></div></section></div> : null}
  </>;
}
