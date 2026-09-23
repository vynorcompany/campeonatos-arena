"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createManualUpcomingMatchAction } from "@/lib/actions/upcoming-match";

type TournamentOption = { id: string; name: string };

export function TvMatchSourceFields({ initialSource, initialTournamentId, tournaments, manualMatchCount }: {
  initialSource: "MANUAL" | "TOURNAMENT";
  initialTournamentId: string;
  tournaments: TournamentOption[];
  manualMatchCount: number;
}) {
  const [source, setSource] = useState(initialSource);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    if (!manualOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setManualOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [manualOpen]);

  return <>
    <div className="field tv-match-source-field">
      <label htmlFor="tv-match-source">Origem dos jogos</label>
      <select id="tv-match-source" name="tvMatchSource" value={source} onChange={(event) => {
        const next = event.target.value as "MANUAL" | "TOURNAMENT";
        setSource(next);
        if (next === "MANUAL") setManualOpen(true);
      }}>
        <option value="MANUAL">Jogos manuais</option>
        <option value="TOURNAMENT">Jogos de torneios</option>
      </select>
      {source === "MANUAL" ? <button type="button" className="tv-source-edit-link" onClick={() => setManualOpen(true)}>Preencher jogos manuais · {manualMatchCount}</button> : null}
    </div>
    <div className="field tv-source-tournament-field">
      <label htmlFor="tv-source-tournament">Torneio dos jogos</label>
      <select id="tv-source-tournament" name="tvSourceTournamentId" defaultValue={initialTournamentId} disabled={source !== "TOURNAMENT"} required={source === "TOURNAMENT"}>
        <option value="">Selecione um torneio</option>
        {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
      </select>
      {source === "TOURNAMENT" ? <small>Jogos em andamento e próximos desse torneio aparecerão na TV.</small> : null}
    </div>
    {manualOpen && typeof document !== "undefined" ? createPortal(
      <div className="tv-manual-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setManualOpen(false); }}>
        <section className="tv-manual-modal" role="dialog" aria-modal="true" aria-labelledby="tv-manual-title">
          <header><div><h2 id="tv-manual-title">Jogos manuais</h2><p>Adicione partidas à rotação da TV.</p></div><button type="button" className="tv-manual-modal-close" aria-label="Fechar" onClick={() => setManualOpen(false)}>×</button></header>
          <SafeActionForm action={createManualUpcomingMatchAction} successMessage="Jogo adicionado à TV." className="tv-manual-match-form">
            <label>Dupla 1<input name="homePairName" maxLength={80} required placeholder="Nome da dupla" /></label>
            <label>Dupla 2<input name="awayPairName" maxLength={80} required placeholder="Nome da dupla" /></label>
            <label>Horário<input name="scheduledTime" type="time" /></label>
            <label>Quadra<input name="courtName" maxLength={80} required placeholder="Nome da quadra" /></label>
            <label>Status<select name="status"><option value="SCHEDULED">Agendado</option><option value="LIVE">Em andamento</option><option value="FINISHED">Encerrado</option></select></label>
            <footer><Link className="button button-secondary" href="/proximos-jogos" onClick={() => setManualOpen(false)}>Ver e editar todos</Link><SubmitButton label="Adicionar jogo" pendingLabel="Adicionando..." className="button button-primary" /></footer>
          </SafeActionForm>
        </section>
      </div>, document.body) : null}
  </>;
}
