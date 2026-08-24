"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { cancelCourtBookingAction, createQuickPlayerAction, saveCourtBookingAction } from "@/lib/actions/calendar";
import { openBookingComandasAction } from "@/lib/actions/comanda";

type Player = { id: string; name: string };
type Court = { id: string; name: string };
type Teacher = { id: string; name: string };
type Participant = { playerId: string; amountCents: number; paymentMethod: string };
type AgendaSlot = { occurrenceId?: string; courtId: string; courtIds?: string[]; courtName: string; dateLabel: string; dateValue: string; startsAt: string; endsAt: string; state: "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED"; priceCents?: number; bookingTypeName?: string; notes?: string; teacherId?: string; participants?: Participant[] };

const emptyParticipant = (): Participant => ({ playerId: "", amountCents: 0, paymentMethod: "" });
const paymentOptions = [["", "Em aberto"], ["PIX", "PIX"], ["CASH", "Dinheiro"], ["CREDIT_CARD", "Cartão de crédito"], ["DEBIT_CARD", "Cartão de débito"], ["CREDIT_BALANCE", "Saldo de crédito"], ["TRANSFER", "Transferência"]] as const;
function toCurrencyInput(cents: number) { return (cents / 100).toFixed(2).replace(".", ","); }
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
  const [duration, setDuration] = useState(Math.max(15, startMinute(slot.endsAt) - startMinute(slot.startsAt)));
  const [notes, setNotes] = useState(slot.notes ?? "");
  const [teacherId, setTeacherId] = useState(slot.teacherId ?? "");
  const [courtIds, setCourtIds] = useState<string[]>(slot.courtIds?.length ? slot.courtIds : [slot.courtId]);
  const [participants, setParticipants] = useState<Participant[]>(() => [...(slot.participants ?? []), ...Array.from({ length: Math.max(0, 4 - (slot.participants?.length ?? 0)) }, emptyParticipant)]);
  const [courtAmountCents, setCourtAmountCents] = useState(slot.priceCents ?? (slot.participants ?? []).reduce((total, participant) => total + participant.amountCents, 0));
  const [super12PaymentPlayerId, setSuper12PaymentPlayerId] = useState("");
  const [error, setError] = useState("");
  const super12 = isSuper12(bookingTypeName);
  const lesson = isLessonType(bookingTypeName);
  const selectedParticipants = participants.filter((participant) => participant.playerId);
  const matchingPlayers = useMemo(() => playerOptions.filter((player) => player.name.toLowerCase().includes(playerSearch.toLowerCase())), [playerOptions, playerSearch]);
  const stateLabel = slot.state === "AVAILABLE" ? "Novo agendamento" : slot.state === "OCCUPIED" ? "Editar agendamento" : "Horário indisponível";
  const endTime = minuteLabel(startMinute(slot.startsAt) + duration);
  const reservationName = super12 ? "Super 12" : `${playerOptions.find((player) => player.id === selectedParticipants[0]?.playerId)?.name ?? "Cliente"} - ${bookingTypeName}`;
  const addParticipant = () => setParticipants((current) => [...current, emptyParticipant()]);
  const updateParticipant = (index: number, values: Partial<Participant>) => setParticipants((current) => current.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...values } : participant));
  const removeParticipant = (index: number) => setParticipants((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const toggleCourt = (courtId: string) => setCourtIds((current) => current.includes(courtId) ? current.filter((id) => id !== courtId) : [...current, courtId]);
  const addSuper12Participant = (playerId: string) => { if (selectedParticipants.some((participant) => participant.playerId === playerId)) return; setParticipants((current) => [...current.filter((participant) => participant.playerId), { playerId, amountCents: courtAmountCents, paymentMethod: "" }]); setPlayerSearch(""); };
  const setAmountPerAthlete = (amountCents: number) => { setCourtAmountCents(amountCents); setParticipants((current) => current.map((participant) => participant.playerId ? { ...participant, amountCents } : participant)); };
  const splitEvenly = () => { if (!selectedParticipants.length) { setError("Selecione ao menos um atleta para dividir o valor."); return; } const part = Math.floor(courtAmountCents / selectedParticipants.length); const remainder = courtAmountCents % selectedParticipants.length; setParticipants((current) => { let position = 0; return current.map((participant) => !participant.playerId ? participant : { ...participant, amountCents: part + (position++ === selectedParticipants.length - 1 ? remainder : 0) }); }); };
  const submit = () => {
    setError("");
    if (super12 && !courtIds.length) { setError("Selecione ao menos uma quadra para o Super 12."); return; }
    if (lesson && !teacherId) { setError("Selecione o professor responsável."); return; }
    const formData = new FormData();
    if (slot.occurrenceId) formData.set("occurrenceId", slot.occurrenceId);
    formData.set("courtId", slot.courtId); formData.set("courtIds", JSON.stringify(super12 ? courtIds : [slot.courtId])); formData.set("title", reservationName); formData.set("startsAt", `${slot.dateValue}T${slot.startsAt}`); formData.set("durationMinutes", String(duration)); formData.set("bookingTypeName", bookingTypeName); formData.set("teacherId", lesson ? teacherId : ""); formData.set("notes", notes); formData.set("participants", JSON.stringify(selectedParticipants));
    startTransition(async () => { try { await saveCourtBookingAction(formData); setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o agendamento."); } });
  };
  const cancelBooking = (mode: "CANCEL" | "FREE") => {
    if (!slot.occurrenceId) return;
    setError("");
    const formData = new FormData(); formData.set("occurrenceId", slot.occurrenceId); formData.set("mode", mode);
    startTransition(async () => { try { await cancelCourtBookingAction(formData); setOptionsOpen(false); setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cancelar o horário."); } });
  };
  const openComandas = () => {
    if (!slot.occurrenceId) return;
    setError("");
    const formData = new FormData(); formData.set("occurrenceId", slot.occurrenceId);
    startTransition(async () => { try { await openBookingComandasAction(formData); setOptionsOpen(false); router.push("/comandas"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível abrir as comandas."); } });
  };

  return <>
    <div className="agenda-slot-entry"><button type="button" className="agenda-slot-trigger" onClick={() => setOpen(true)}>{children}</button>{slot.state === "OCCUPIED" && slot.occurrenceId ? <div className="agenda-slot-options"><button type="button" className="agenda-slot-options-trigger" aria-label="Opções do horário" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((current) => !current)}>⋯</button>{optionsOpen ? <div className="agenda-slot-options-menu"><button type="button" onClick={() => cancelBooking("CANCEL")}>Cancelar horário</button><button type="button" onClick={() => cancelBooking("FREE")}>Livrar horário</button><button type="button" onClick={openComandas}>Abrir comandas</button></div> : null}</div> : null}</div>
    {open ? <div className="agenda-slot-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="agenda-slot-dialog agenda-booking-dialog" role="dialog" aria-modal="true" aria-label="Agendamento de horário" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">{stateLabel}</p><h2>{slot.courtName}</h2><span>{slot.dateLabel} · {slot.startsAt} às {endTime}</span></div><button className="button" type="button" onClick={() => setOpen(false)}>Fechar</button></header>
      {slot.state === "UNAVAILABLE" ? <p className="form-note">Este horário está bloqueado pela configuração da quadra.</p> : <div className="agenda-booking-form">
        <label>Tipo de reserva<select value={bookingTypeName} onChange={(event) => setBookingTypeName(event.target.value)}>{bookingTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
        <label>Nome da reserva<input readOnly value={reservationName} /></label>
        <label>Horário<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[30, 60, 90, 120, 150, 180].map((minutes) => <option value={minutes} key={minutes}>{slot.startsAt} às {minuteLabel(startMinute(slot.startsAt) + minutes)}</option>)}</select></label>
        {lesson ? <label>Professor responsável<select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} required><option value="">Selecione o professor</option>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}</select></label> : null}
        <label>Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {super12 ? <section className="agenda-super12-courts"><strong>Quadras do Super 12</strong><div>{courts.map((court) => <label key={court.id}><input type="checkbox" checked={courtIds.includes(court.id)} onChange={() => toggleCourt(court.id)} />{court.name}</label>)}</div></section> : null}
        <section className="agenda-participants"><div className="agenda-participants-heading"><div><h3>{super12 ? `Atletas do Super 12 (${selectedParticipants.length})` : "Atletas"}</h3><p>Valor com forma de pagamento entra como quitado; sem forma, fica em aberto.</p></div>{!super12 ? <button type="button" className="button" onClick={addParticipant}>Adicionar atleta</button> : null}</div><div className="agenda-player-search"><input placeholder={super12 ? "Buscar e adicionar atleta..." : "Pesquisar atleta..."} value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} />{playerSearch.trim() && !matchingPlayers.length ? <button type="button" className="button" onClick={() => { setQuickName(playerSearch); setQuickCreateOpen(true); }}>Cadastrar novo atleta</button> : null}</div>
          {super12 && playerSearch.trim() && matchingPlayers.length ? <div className="agenda-super12-results">{matchingPlayers.filter((player) => !selectedParticipants.some((participant) => participant.playerId === player.id)).slice(0, 8).map((player) => <button type="button" key={player.id} onClick={() => addSuper12Participant(player.id)}>{player.name}</button>)}</div> : null}
          <div className="agenda-charge-tools"><label>{super12 ? "Valor por atleta" : "Valor da quadra"}<input inputMode="decimal" value={toCurrencyInput(courtAmountCents)} onChange={(event) => super12 ? setAmountPerAthlete(toCents(event.target.value)) : setCourtAmountCents(toCents(event.target.value))} /></label>{!super12 ? <button type="button" className="button button-primary" onClick={splitEvenly}>Dividir igualmente</button> : null}</div>
          {super12 ? <><div className="agenda-super12-participants">{selectedParticipants.length ? selectedParticipants.map((participant) => <button type="button" key={participant.playerId} className={super12PaymentPlayerId === participant.playerId ? "agenda-super12-chip agenda-super12-chip-active" : "agenda-super12-chip"} onClick={() => setSuper12PaymentPlayerId(participant.playerId)}><strong>{playerOptions.find((player) => player.id === participant.playerId)?.name}</strong>{participant.paymentMethod ? <span className="agenda-super12-payment-status">R$ {toCurrencyInput(participant.amountCents)} · {paymentOptions.find(([value]) => value === participant.paymentMethod)?.[1]}</span> : <small>Em aberto</small>}</button>) : <p>Nenhum atleta selecionado.</p>}</div>{super12PaymentPlayerId ? (() => { const index = participants.findIndex((participant) => participant.playerId === super12PaymentPlayerId); const participant = participants[index]; const player = playerOptions.find((item) => item.id === super12PaymentPlayerId); return participant ? <div className="agenda-super12-payment"><strong>Pagamento do atleta: {player?.name}</strong><label>Forma de pagamento<select value={participant.paymentMethod} onChange={(event) => updateParticipant(index, { paymentMethod: event.target.value })}>{paymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="button button-danger" onClick={() => { removeParticipant(index); setSuper12PaymentPlayerId(""); }}>Remover atleta</button></div> : null; })() : null}</> : <div className="agenda-participant-list">{participants.map((participant, index) => <div className="agenda-participant-row" key={`${participant.playerId}-${index}`}><label>Atleta {participant.paymentMethod ? <span className="agenda-payment-indicator" title="Pagamento confirmado">$</span> : null}<select value={participant.playerId} onChange={(event) => updateParticipant(index, { playerId: event.target.value })}><option value="">Selecione atleta</option>{playerOptions.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label>Valor<input inputMode="decimal" value={toCurrencyInput(participant.amountCents)} onChange={(event) => updateParticipant(index, { amountCents: toCents(event.target.value) })} /></label><label>Forma de pagamento<select value={participant.paymentMethod} onChange={(event) => updateParticipant(index, { paymentMethod: event.target.value })}>{paymentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="button button-danger" onClick={() => removeParticipant(index)}>Remover</button></div>)}</div>}
        </section>{error ? <p className="form-error">{error}</p> : null}<footer>{slot.state === "OCCUPIED" && slot.occurrenceId ? <button type="button" className="button button-danger" onClick={() => cancelBooking("CANCEL")} disabled={pending}>Cancelar horário</button> : null}<button type="button" className="button" onClick={() => setOpen(false)}>Fechar</button><button type="button" className="button button-primary" onClick={submit} disabled={pending}>{pending ? "Salvando…" : "Salvar agendamento"}</button></footer>
      </div>}
    </section>{quickCreateOpen ? <div className="agenda-quick-player"><h3>Novo atleta</h3><label>Nome<input value={quickName} onChange={(event) => setQuickName(event.target.value)} /></label><label>Telefone<input value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} /></label><div><button type="button" className="button" onClick={() => setQuickCreateOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => { const data = new FormData(); data.set("name", quickName); data.set("phone", quickPhone); startTransition(async () => { try { const player = await createQuickPlayerAction(data); setPlayerOptions((current) => [...current, player]); if (super12) addSuper12Participant(player.id); else { const index = participants.findIndex((item) => !item.playerId); if (index >= 0) updateParticipant(index, { playerId: player.id }); } setQuickCreateOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar atleta."); } }); }}>Salvar atleta</button></div></div> : null}</div> : null}
  </>;
}
