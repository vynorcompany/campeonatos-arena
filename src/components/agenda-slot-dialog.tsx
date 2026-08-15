"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createQuickPlayerAction, saveCourtBookingAction } from "@/lib/actions/calendar";

type Player = { id: string; name: string };
type Participant = { playerId: string; amountCents: number; paymentMethod: string };
type AgendaSlot = {
  occurrenceId?: string; courtId: string; courtName: string; dateLabel: string; dateValue: string;
  startsAt: string; endsAt: string; state: "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED";
  priceLabel?: string; priceCents?: number; title?: string; sourceType?: string; bookingTypeName?: string; notes?: string; participants?: Participant[];
};

function toCurrencyInput(cents: number) { return (cents / 100).toFixed(2).replace(".", ","); }
function toCents(value: string) { const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."); return Math.max(0, Math.round((Number(normalized) || 0) * 100)); }
function minuteLabel(value: number) { return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
function startMinute(value: string) { return Number(value.slice(0, 2)) * 60 + Number(value.slice(3)); }

export function AgendaSlotDialog({ slot, players, bookingTypes, children }: { slot: AgendaSlot; players: Player[]; bookingTypes: string[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [playerOptions, setPlayerOptions] = useState(players);
  const [bookingTypeName, setBookingTypeName] = useState(slot.bookingTypeName ?? "Reserva");
  const [playerSearch, setPlayerSearch] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [duration, setDuration] = useState(Math.max(15, (Number(slot.endsAt.slice(0, 2)) * 60 + Number(slot.endsAt.slice(3))) - (Number(slot.startsAt.slice(0, 2)) * 60 + Number(slot.startsAt.slice(3)))));
  const [notes, setNotes] = useState(slot.notes ?? "");
  const [participants, setParticipants] = useState<Participant[]>(() => [...(slot.participants ?? []), ...Array.from({ length: Math.max(0, 4 - (slot.participants?.length ?? 0)) }, () => ({ playerId: "", amountCents: 0, paymentMethod: "" }))]);
  const [courtAmountCents, setCourtAmountCents] = useState(slot.priceCents ?? (slot.participants ?? []).reduce((total, participant) => total + participant.amountCents, 0));
  const [error, setError] = useState("");
  const stateLabel = slot.state === "AVAILABLE" ? "Novo agendamento" : slot.state === "OCCUPIED" ? "Editar agendamento" : "Horário indisponível";
  const addParticipant = () => setParticipants([...participants, { playerId: "", amountCents: 0, paymentMethod: "" }]);
  const updateParticipant = (index: number, values: Partial<Participant>) => setParticipants(participants.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...values } : participant));
  const endTime = minuteLabel(startMinute(slot.startsAt) + duration);
  const splitEvenly = () => { const selected = participants.map((participant, index) => ({ participant, index })).filter(({ participant }) => participant.playerId); if (!selected.length) { setError("Selecione ao menos um atleta para dividir o valor."); return; } const part = Math.floor(courtAmountCents / selected.length); const remainder = courtAmountCents % selected.length; setParticipants(participants.map((participant, index) => { const position = selected.findIndex((item) => item.index === index); return position < 0 ? participant : { ...participant, amountCents: part + (position === selected.length - 1 ? remainder : 0) }; })); };
  const submit = () => {
    setError("");
    const formData = new FormData();
    if (slot.occurrenceId) formData.set("occurrenceId", slot.occurrenceId);
    const client = playerOptions.find((player) => player.id === participants.find((participant) => participant.playerId)?.playerId);
    formData.set("courtId", slot.courtId); formData.set("title", `${client?.name ?? "Cliente"} - ${bookingTypeName}`); formData.set("startsAt", `${slot.dateValue}T${slot.startsAt}`);
    formData.set("durationMinutes", String(duration)); formData.set("bookingTypeName", bookingTypeName); formData.set("notes", notes); formData.set("participants", JSON.stringify(participants.filter((participant) => participant.playerId)));
    startTransition(async () => { try { await saveCourtBookingAction(formData); setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o agendamento."); } });
  };
  return <>
    <button type="button" className="agenda-slot-trigger" onClick={() => setOpen(true)}>{children}</button>
    {open ? <div className="agenda-slot-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="agenda-slot-dialog agenda-booking-dialog" role="dialog" aria-modal="true" aria-label="Agendamento de horário" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">{stateLabel}</p><h2>{slot.courtName}</h2><span>{slot.dateLabel} · {slot.startsAt} às {endTime}</span></div><button className="button" type="button" onClick={() => setOpen(false)}>Fechar</button></header>
      {slot.state === "UNAVAILABLE" ? <p className="form-note">Este horário está bloqueado pela configuração da quadra.</p> : <div className="agenda-booking-form">
        <label>Tipo de reserva<select value={bookingTypeName} onChange={(event) => setBookingTypeName(event.target.value)}>{bookingTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
        <label>Nome da reserva<input readOnly value={`${playerOptions.find((player) => player.id === participants.find((participant) => participant.playerId)?.playerId)?.name ?? "Cliente"} - ${bookingTypeName}`} /></label>
        <label>Horário<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[30, 60, 90, 120, 150, 180].map((minutes) => <option value={minutes} key={minutes}>{slot.startsAt} às {minuteLabel(startMinute(slot.startsAt) + minutes)}</option>)}</select></label>
        <label>Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <section className="agenda-participants"><div className="agenda-participants-heading"><div><h3>Atletas</h3><p>Valor com forma de pagamento entra como quitado; sem forma, fica em aberto.</p></div><button type="button" className="button" onClick={addParticipant}>Adicionar atleta</button></div><div className="agenda-player-search"><input placeholder="Pesquisar atleta..." value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} /><button type="button" className="button" onClick={() => { setQuickName(playerSearch); setQuickCreateOpen(true); }}>Cadastrar novo atleta</button></div>
          <div className="agenda-charge-tools"><label>Valor da quadra<input inputMode="decimal" value={toCurrencyInput(courtAmountCents)} onChange={(event) => setCourtAmountCents(toCents(event.target.value))} /></label><button type="button" className="button button-primary" onClick={splitEvenly}>Dividir igualmente</button></div>
          <div className="agenda-participant-list">{participants.map((participant, index) => <div className="agenda-participant-row" key={`${participant.playerId}-${index}`}><label>Atleta<select value={participant.playerId} onChange={(event) => updateParticipant(index, { playerId: event.target.value })}><option value="">Selecione atleta</option>{playerOptions.filter((player) => player.name.toLowerCase().includes(playerSearch.toLowerCase())).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label>Valor<input inputMode="decimal" value={toCurrencyInput(participant.amountCents)} onChange={(event) => updateParticipant(index, { amountCents: toCents(event.target.value) })} /></label><label>Forma de pagamento<select value={participant.paymentMethod} onChange={(event) => updateParticipant(index, { paymentMethod: event.target.value })}><option value="">Em aberto</option><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão</option><option value="TRANSFER">Transferência</option></select></label><button type="button" className="button button-danger" onClick={() => setParticipants(participants.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></div>)}</div>
        </section>
        {error ? <p className="form-error">{error}</p> : null}<footer><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={submit} disabled={pending}>{pending ? "Salvando…" : "Salvar agendamento"}</button></footer>
      </div>}
    </section>{quickCreateOpen ? <div className="agenda-quick-player"><h3>Novo atleta</h3><label>Nome<input value={quickName} onChange={(event) => setQuickName(event.target.value)} /></label><label>Telefone<input value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} /></label><div><button type="button" className="button" onClick={() => setQuickCreateOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={() => { const data = new FormData(); data.set("name", quickName); data.set("phone", quickPhone); startTransition(async () => { try { const player = await createQuickPlayerAction(data); setPlayerOptions([...playerOptions, player]); const index = participants.findIndex((item) => !item.playerId); if (index >= 0) updateParticipant(index, { playerId: player.id }); setQuickCreateOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível cadastrar atleta."); } }); }}>Salvar atleta</button></div></div> : null}</div> : null}
  </>;
}
