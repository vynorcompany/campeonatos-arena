"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createManualUpcomingMatchAction, deleteManualUpcomingMatchAction, updateManualUpcomingMatchAction } from "@/lib/actions/upcoming-match";

type TournamentOption = { id: string; name: string };
type ManualMatch = { id: string; displayOrder: number; homePairName: string; awayPairName: string; scheduledTime: string; courtName: string; status: string };

export function TvMatchSourceFields({ initialSource, initialTournamentId, tournaments, manualMatches }: {
  initialSource: "MANUAL" | "TOURNAMENT";
  initialTournamentId: string;
  tournaments: TournamentOption[];
  manualMatches: ManualMatch[];
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
      {source === "MANUAL" ? <button type="button" className="tv-source-edit-link" onClick={() => setManualOpen(true)}>Preencher jogos manuais · {manualMatches.length}</button> : null}
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
          <header><div><h2 id="tv-manual-title">Jogos manuais</h2><p>Cadastre e edite até 3 jogos para a TV.</p></div><button type="button" className="tv-manual-modal-close" aria-label="Fechar" onClick={() => setManualOpen(false)}>×</button></header>
          {manualMatches.length > 3 ? <p className="tv-manual-warning">Há {manualMatches.length} jogos antigos. Os 3 primeiros aparecem na TV; remova os excedentes para cadastrar novos.</p> : null}
          <div className="tv-manual-games">
            {manualMatches.map((match) => <div className="tv-manual-game" key={match.id}>
              <SafeActionForm action={updateManualUpcomingMatchAction} successMessage="Jogo atualizado." className="tv-manual-match-form">
                <input type="hidden" name="matchId" value={match.id} /><input type="hidden" name="displayOrder" value={match.displayOrder} />
                <label>Dupla 1<input name="homePairName" maxLength={80} required defaultValue={match.homePairName} /></label>
                <label>Dupla 2<input name="awayPairName" maxLength={80} required defaultValue={match.awayPairName} /></label>
                <label>Horário<input name="scheduledTime" type="time" defaultValue={match.scheduledTime} /></label>
                <label>Quadra<input name="courtName" maxLength={80} required defaultValue={match.courtName} /></label>
                <label>Status<select name="status" defaultValue={match.status}><option value="SCHEDULED">Agendado</option><option value="LIVE">Em andamento</option><option value="FINISHED">Encerrado</option></select></label>
                <footer><SubmitButton label="Salvar jogo" pendingLabel="Salvando..." className="button button-primary" /></footer>
              </SafeActionForm>
              <SafeActionForm action={deleteManualUpcomingMatchAction} successMessage="Jogo removido." className="tv-manual-delete" confirmKeyword="EXCLUIR" confirmPrompt="Remover este jogo da TV?"><input type="hidden" name="matchId" value={match.id} /><SubmitButton label="Remover jogo" pendingLabel="Removendo..." className="button button-danger" /></SafeActionForm>
            </div>)}
            {manualMatches.length < 3 ? <SafeActionForm action={createManualUpcomingMatchAction} successMessage="Jogo adicionado à TV." resetOnSuccess className="tv-manual-match-form tv-manual-new-game">
              <label>Dupla 1<input name="homePairName" maxLength={80} required placeholder="Nome da dupla" /></label>
              <label>Dupla 2<input name="awayPairName" maxLength={80} required placeholder="Nome da dupla" /></label>
              <label>Horário<input name="scheduledTime" type="time" /></label>
              <label>Quadra<input name="courtName" maxLength={80} required placeholder="Nome da quadra" /></label>
              <label>Status<select name="status"><option value="SCHEDULED">Agendado</option><option value="LIVE">Em andamento</option><option value="FINISHED">Encerrado</option></select></label>
              <footer><SubmitButton label="Adicionar jogo" pendingLabel="Adicionando..." className="button button-primary" /></footer>
            </SafeActionForm> : null}
          </div>
        </section>
      </div>, document.body) : null}
  </>;
}
