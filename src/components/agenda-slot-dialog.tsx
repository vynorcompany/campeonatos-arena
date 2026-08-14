"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCourtBookingAction } from "@/lib/actions/calendar";

type Player = { id: string; name: string };
type Participant = { playerId: string; amountCents: number; paymentMethod: string };
type AgendaSlot = {
  occurrenceId?: string; courtId: string; courtName: string; dateLabel: string; dateValue: string;
  startsAt: string; endsAt: string; state: "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED";
  priceLabel?: string; title?: string; sourceType?: string; modality?: string; notes?: string; participants?: Participant[];
};

function toCurrencyInput(cents: number) { return (cents / 100).toFixed(2).replace(".", ","); }
function toCents(value: string) { const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."); return Math.max(0, Math.round((Number(normalized) || 0) * 100)); }

export function AgendaSlotDialog({ slot, players, children }: { slot: AgendaSlot; players: Player[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [title, setTitle] = useState(slot.title ?? "Reserva de quadra");
  const [duration, setDuration] = useState(Math.max(15, (Number(slot.endsAt.slice(0, 2)) * 60 + Number(slot.endsAt.slice(3))) - (Number(slot.startsAt.slice(0, 2)) * 60 + Number(slot.startsAt.slice(3)))));
  const [modality, setModality] = useState(slot.modality ?? "");
  const [notes, setNotes] = useState(slot.notes ?? "");
  const [participants, setParticipants] = useState<Participant[]>(slot.participants ?? []);
  const [error, setError] = useState("");
  const stateLabel = slot.state === "AVAILABLE" ? "Novo agendamento" : slot.state === "OCCUPIED" ? "Editar agendamento" : "Horário indisponível";
  const addParticipant = () => { const first = players.find((player) => !participants.some((item) => item.playerId === player.id)); if (first) setParticipants([...participants, { playerId: first.id, amountCents: 0, paymentMethod: "" }]); };
  const updateParticipant = (index: number, values: Partial<Participant>) => setParticipants(participants.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...values } : participant));
  const submit = () => {
    setError("");
    const formData = new FormData();
    if (slot.occurrenceId) formData.set("occurrenceId", slot.occurrenceId);
    formData.set("courtId", slot.courtId); formData.set("title", title); formData.set("startsAt", `${slot.dateValue}T${slot.startsAt}`);
    formData.set("durationMinutes", String(duration)); formData.set("modality", modality); formData.set("notes", notes); formData.set("participants", JSON.stringify(participants));
    startTransition(async () => { try { await saveCourtBookingAction(formData); setOpen(false); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o agendamento."); } });
  };
  return <>
    <button type="button" className="agenda-slot-trigger" onClick={() => setOpen(true)}>{children}</button>
    {open ? <div className="agenda-slot-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="agenda-slot-dialog agenda-booking-dialog" role="dialog" aria-modal="true" aria-label="Agendamento de horário" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">{stateLabel}</p><h2>{slot.courtName}</h2><span>{slot.dateLabel} · {slot.startsAt}</span></div><button className="button" type="button" onClick={() => setOpen(false)}>Fechar</button></header>
      {slot.state === "UNAVAILABLE" ? <p className="form-note">Este horário está bloqueado pela configuração da quadra.</p> : <div className="agenda-booking-form">
        <label>Descrição<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Modalidade<input value={modality} placeholder="Ex.: Padel" onChange={(event) => setModality(event.target.value)} /></label>
        <label>Duração<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[30, 60, 90, 120, 150, 180].map((minutes) => <option value={minutes} key={minutes}>{minutes} min</option>)}</select></label>
        <label>Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <section className="agenda-participants"><div className="agenda-participants-heading"><div><h3>Atletas</h3><p>Valor com forma de pagamento entra como quitado; sem forma, fica em aberto.</p></div><button type="button" className="button" onClick={addParticipant} disabled={participants.length >= players.length}>Adicionar atleta</button></div>
          {participants.length ? <div className="agenda-participant-list">{participants.map((participant, index) => <div className="agenda-participant-row" key={`${participant.playerId}-${index}`}><label>Atleta<select value={participant.playerId} onChange={(event) => updateParticipant(index, { playerId: event.target.value })}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label><label>Valor<input inputMode="decimal" value={toCurrencyInput(participant.amountCents)} onChange={(event) => updateParticipant(index, { amountCents: toCents(event.target.value) })} /></label><label>Forma de pagamento<select value={participant.paymentMethod} onChange={(event) => updateParticipant(index, { paymentMethod: event.target.value })}><option value="">Em aberto</option><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CARD">Cartão</option><option value="TRANSFER">Transferência</option></select></label><button type="button" className="button button-danger" onClick={() => setParticipants(participants.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></div>)}</div> : <p className="form-note">Adicione os atletas para dividir e registrar a cobrança.</p>}
        </section>
        {error ? <p className="form-error">{error}</p> : null}<footer><button type="button" className="button" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="button button-primary" onClick={submit} disabled={pending}>{pending ? "Salvando…" : "Salvar agendamento"}</button></footer>
      </div>}
    </section></div> : null}
  </>;
}
