"use client";

import { useState } from "react";

type AgendaSlot = {
  courtName: string;
  dateLabel: string;
  startsAt: string;
  endsAt: string;
  state: "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED";
  priceLabel?: string;
  title?: string;
  sourceType?: string;
};

export function AgendaSlotDialog({ slot, children }: { slot: AgendaSlot; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const stateLabel = slot.state === "AVAILABLE" ? "Livre para reserva" : slot.state === "OCCUPIED" ? "Ocupado" : "Indisponível";
  return <>
    <button type="button" className="agenda-slot-trigger" onClick={() => setOpen(true)}>{children}</button>
    {open ? <div className="agenda-slot-backdrop" role="presentation" onMouseDown={() => setOpen(false)}><section className="agenda-slot-dialog" role="dialog" aria-modal="true" aria-label="Detalhes do horário" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">{stateLabel}</p><h2>{slot.courtName}</h2></div><button className="button" type="button" onClick={() => setOpen(false)}>Fechar</button></header><dl><div><dt>Data</dt><dd>{slot.dateLabel}</dd></div><div><dt>Horário</dt><dd>{slot.startsAt}–{slot.endsAt}</dd></div>{slot.priceLabel ? <div><dt>Valor</dt><dd>{slot.priceLabel}</dd></div> : null}{slot.title ? <div><dt>Agendamento</dt><dd>{slot.title}{slot.sourceType ? ` · ${slot.sourceType}` : ""}</dd></div> : null}</dl></section></div> : null}
  </>;
}
