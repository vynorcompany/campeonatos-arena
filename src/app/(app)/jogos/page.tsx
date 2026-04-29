import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  generateMatchesAction,
  updateMatchCourtAction,
  updateMatchParticipantsAction,
  updateMatchResultAction,
  updateMatchScheduleAction
} from "@/lib/actions/tournament";
import { requireArenaAccess } from "@/lib/auth/session";
import { getArenaDashboard } from "@/lib/services/tournament";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de grupos",
  QUARTERFINAL: "Mata-mata: quartas",
  SEMIFINAL: "Mata-mata: semifinais",
  FINAL: "Mata-mata: final"
};

const courtNames = ["Agecon", "Origem", "Elaine"];

function getCurrentStage(
  groupedMatches: NonNullable<Awaited<ReturnType<typeof getArenaDashboard>>["activeTournament"]>["matches"],
  knockoutMatches: NonNullable<Awaited<ReturnType<typeof getArenaDashboard>>["activeTournament"]>["matches"]
) {
  const quarterfinals = knockoutMatches.filter((match) => match.stage === "QUARTERFINAL");
  const semifinals = knockoutMatches.filter((match) => match.stage === "SEMIFINAL");
  const final = knockoutMatches.filter((match) => match.stage === "FINAL");

  const isPending = (matches: typeof groupedMatches) =>
    matches.length > 0 && matches.some((match) => match.winnerPairId === null);

  if (isPending(groupedMatches)) {
    return {
      stage: "GROUP" as const,
      title: "Fase de grupos",
      description: `${groupedMatches.length} jogos programados.`
    };
  }

  if (isPending(quarterfinals)) {
    return {
      stage: "QUARTERFINAL" as const,
      title: "Mata-mata: quartas",
      description: `${quarterfinals.length} jogos programados.`
    };
  }

  if (isPending(semifinals)) {
    return {
      stage: "SEMIFINAL" as const,
      title: "Mata-mata: semifinais",
      description: `${semifinals.length} jogos programados.`
    };
  }

  if (isPending(final)) {
    return {
      stage: "FINAL" as const,
      title: "Mata-mata: final",
      description: `${final.length} jogo${final.length === 1 ? "" : "s"} programado${final.length === 1 ? "" : "s"}.`
    };
  }

  if (groupedMatches.length) {
    return {
      stage: "GROUP" as const,
      title: "Fase de grupos concluída",
      description: `${groupedMatches.length} jogos finalizados.`
    };
  }

  return {
    stage: "GROUP" as const,
    title: "Jogos do torneio",
    description: "Gere os confrontos para começar a competição."
  };
}

export default async function MatchesPage() {
  const auth = await requireArenaAccess();
  const { activeTournament } = await getArenaDashboard(auth.arenaId);

  const groupedMatches = activeTournament?.matches.filter((match) => match.stage === "GROUP") ?? [];
  const knockoutMatches = activeTournament?.matches.filter((match) => match.stage !== "GROUP") ?? [];
  const currentStage = activeTournament ? getCurrentStage(groupedMatches, knockoutMatches) : null;
  const currentMatches = activeTournament
    ? activeTournament.matches.filter((match) => match.stage === currentStage?.stage)
    : [];

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Jogos</p>
          <h1>Confrontos e resultados</h1>
          <p className="muted">
            Acompanhe a fase atual do torneio, registre resultados e organize as quadras com facilidade.
          </p>
        </div>
      </header>

      {!activeTournament ? (
        <SectionCard title="Nenhum torneio em andamento">
          <p className="muted">Crie um torneio para começar a gerar os jogos.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Gerar jogos" description="Crie automaticamente os confrontos do torneio.">
            <form action={generateMatchesAction}>
              <input type="hidden" name="tournamentId" value={activeTournament.id} />
              <SubmitButton label="Gerar jogos" pendingLabel="Gerando..." className="button button-primary" />
            </form>
          </SectionCard>

          <SectionCard
            title={currentStage?.title ?? "Fase atual"}
            description={currentStage?.description ?? "Acompanhe os jogos do torneio."}
          >
            {currentStage?.stage === "GROUP" ? (
              groupedMatches.length ? (
                <div className="matches-stage-grid">
                  {groupedMatches.map((match) => (
                    <article key={match.id} className="match-card">
                      <div className="match-card-layout">
                        <div className="match-card-main">
                          <div className="match-card-top">
                            <div className="match-copy">
                              <span className="match-kicker">{match.group?.name ?? "Grupo"}</span>
                              <strong>{match.label}</strong>
                            </div>
                            <span className={`match-status${match.winnerPair ? " match-status-done" : ""}`}>
                              {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} x ${match.awayScore}` : "Pendente"}
                            </span>
                          </div>

                          <div className="match-teams-grid">
                            <div className={`match-team-slot${match.winnerPair?.id === match.homePair?.id ? " match-team-slot-winner" : ""}`}>
                              <span className="match-team-label">Dupla 1</span>
                              <strong>{match.homePair?.name ?? "A definir"}</strong>
                            </div>
                            <div className="match-versus-badge">x</div>
                            <div className={`match-team-slot${match.winnerPair?.id === match.awayPair?.id ? " match-team-slot-winner" : ""}`}>
                              <span className="match-team-label">Dupla 2</span>
                              <strong>{match.awayPair?.name ?? "A definir"}</strong>
                            </div>
                          </div>

                          <div className="match-scoreboard">
                            <div className="match-scorebox">
                              <span>Placar</span>
                              <strong>{match.homeScore ?? "-"}</strong>
                            </div>
                            <div className="match-score-divider">x</div>
                            <div className="match-scorebox">
                              <span>Placar</span>
                              <strong>{match.awayScore ?? "-"}</strong>
                            </div>
                          </div>

                          <div className="match-card-meta">
                            <span>{match.scheduledTime ? `Horário: ${match.scheduledTime}` : "Horário ainda não definido"}</span>
                            <span>{match.courtName ? `Quadra: ${match.courtName}` : "Quadra ainda não definida"}</span>
                            <span>{match.winnerPair?.name ? `Vencedor: ${match.winnerPair.name}` : "Resultado pendente"}</span>
                          </div>
                        </div>

                        <aside className="match-card-sidebar">
                          <div className="match-actions match-actions-grid">
                            <form action={updateMatchResultAction} className="inline-form match-score-form match-action-panel">
                              <input type="hidden" name="matchId" value={match.id} />
                              <span className="match-action-title">Resultado</span>
                              <div className="match-score-inputs">
                                <input name="homeScore" type="number" min="0" defaultValue={match.homeScore ?? ""} />
                                <span className="match-score-separator">x</span>
                                <input name="awayScore" type="number" min="0" defaultValue={match.awayScore ?? ""} />
                              </div>
                              <SubmitButton label="Salvar resultado" pendingLabel="..." className="button button-primary" />
                            </form>

                            <form action={updateMatchCourtAction} className="inline-form match-court-form match-action-panel">
                              <input type="hidden" name="matchId" value={match.id} />
                              <span className="match-action-title">Quadra</span>
                              <div className="match-court-options">
                                {courtNames.map((courtName) => (
                                  <label key={`${match.id}-${courtName}`} className="match-court-option">
                                    <input name="courtName" type="radio" value={courtName} defaultChecked={match.courtName === courtName} required />
                                    <span>{courtName}</span>
                                  </label>
                                ))}
                              </div>
                              <SubmitButton label="Salvar quadra" pendingLabel="..." className="button" />
                            </form>

                            <form action={updateMatchScheduleAction} className="inline-form match-schedule-form match-action-panel">
                              <input type="hidden" name="matchId" value={match.id} />
                              <span className="match-action-title">Horário</span>
                              <input
                                className="match-schedule-input"
                                name="scheduledTime"
                                type="time"
                                defaultValue={match.scheduledTime ?? ""}
                                required
                              />
                              <SubmitButton label="Salvar horário" pendingLabel="..." className="button" />
                            </form>
                          </div>
                        </aside>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">Os jogos da fase de grupos aparecerão aqui assim que forem gerados.</p>
              )
            ) : currentMatches.length ? (
              <div className="matches-stage-grid">
                {currentMatches.map((match) => (
                  <article key={match.id} className="match-card match-card-knockout">
                    <div className="match-card-layout">
                      <div className="match-card-main">
                        <div className="match-card-top">
                          <div className="match-copy">
                            <span className="match-kicker">{stageLabels[match.stage]}</span>
                            <strong>{match.label}</strong>
                          </div>
                          <span className={`match-status${match.winnerPair ? " match-status-done" : ""}`}>
                            {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} x ${match.awayScore}` : "Pendente"}
                          </span>
                        </div>

                        <div className="match-teams-grid">
                          <div className={`match-team-slot${match.winnerPair?.id === match.homePair?.id ? " match-team-slot-winner" : ""}`}>
                            <span className="match-team-label">Lado 1</span>
                            <strong>{match.homePair?.name ?? "A definir"}</strong>
                          </div>
                          <div className="match-versus-badge">x</div>
                          <div className={`match-team-slot${match.winnerPair?.id === match.awayPair?.id ? " match-team-slot-winner" : ""}`}>
                            <span className="match-team-label">Lado 2</span>
                            <strong>{match.awayPair?.name ?? "A definir"}</strong>
                          </div>
                        </div>

                        <div className="match-scoreboard">
                          <div className="match-scorebox">
                            <span>Placar</span>
                            <strong>{match.homeScore ?? "-"}</strong>
                          </div>
                          <div className="match-score-divider">x</div>
                          <div className="match-scorebox">
                            <span>Placar</span>
                            <strong>{match.awayScore ?? "-"}</strong>
                          </div>
                        </div>

                        <div className="match-card-meta">
                          <span>{match.scheduledTime ? `Horário: ${match.scheduledTime}` : "Horário ainda não definido"}</span>
                          <span>{match.courtName ? `Quadra: ${match.courtName}` : "Quadra ainda não definida"}</span>
                          <span>{match.winnerPair?.name ? `Vencedor: ${match.winnerPair.name}` : "Resultado pendente"}</span>
                        </div>
                      </div>

                      <aside className="match-card-sidebar">
                        <div className="match-actions">
                          <form action={updateMatchParticipantsAction} className="match-pair-form match-action-panel">
                            <input type="hidden" name="matchId" value={match.id} />
                            <span className="match-action-title">Confronto</span>
                            <select name="homePairId" defaultValue={match.homePairId ?? ""}>
                              <option value="">Dupla 1</option>
                              {activeTournament.pairs.map((pair) => (
                                <option key={`${match.id}-${pair.id}-home`} value={pair.id}>
                                  {pair.name}
                                </option>
                              ))}
                            </select>
                            <select name="awayPairId" defaultValue={match.awayPairId ?? ""}>
                              <option value="">Dupla 2</option>
                              {activeTournament.pairs.map((pair) => (
                                <option key={`${match.id}-${pair.id}-away`} value={pair.id}>
                                  {pair.name}
                                </option>
                              ))}
                            </select>
                            <SubmitButton label="Salvar confronto" pendingLabel="..." className="button" />
                          </form>

                          <div className="match-actions match-actions-grid">
                            <form action={updateMatchResultAction} className="inline-form match-score-form match-action-panel">
                              <input type="hidden" name="matchId" value={match.id} />
                              <span className="match-action-title">Resultado</span>
                              <div className="match-score-inputs">
                                <input name="homeScore" type="number" min="0" defaultValue={match.homeScore ?? ""} />
                                <span className="match-score-separator">x</span>
                                <input name="awayScore" type="number" min="0" defaultValue={match.awayScore ?? ""} />
                              </div>
                              <SubmitButton label="Salvar resultado" pendingLabel="..." className="button button-primary" />
                            </form>

                            <form action={updateMatchCourtAction} className="inline-form match-court-form match-action-panel">
                              <input type="hidden" name="matchId" value={match.id} />
                              <span className="match-action-title">Quadra</span>
                              <div className="match-court-options">
                                {courtNames.map((courtName) => (
                                  <label key={`${match.id}-${courtName}`} className="match-court-option">
                                    <input name="courtName" type="radio" value={courtName} defaultChecked={match.courtName === courtName} required />
                                    <span>{courtName}</span>
                                  </label>
                                ))}
                              </div>
                              <SubmitButton label="Salvar quadra" pendingLabel="..." className="button" />
                            </form>

                            <form action={updateMatchScheduleAction} className="inline-form match-schedule-form match-action-panel">
                              <input type="hidden" name="matchId" value={match.id} />
                              <span className="match-action-title">Horário</span>
                              <input
                                className="match-schedule-input"
                                name="scheduledTime"
                                type="time"
                                defaultValue={match.scheduledTime ?? ""}
                                required
                              />
                              <SubmitButton label="Salvar horário" pendingLabel="..." className="button" />
                            </form>
                          </div>
                        </div>
                      </aside>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Os próximos confrontos aparecerão aqui assim que a nova fase estiver disponível.</p>
            )}
          </SectionCard>

          <SectionCard title="Andamento do torneio" description="Veja o progresso de cada fase da competição.">
            <div className="simple-list">
              <div className="simple-item">
                <strong>Grupos</strong>
                <span>
                  {groupedMatches.filter((match) => match.winnerPairId !== null).length}/{groupedMatches.length} concluídos
                </span>
              </div>
              <div className="simple-item">
                <strong>Quartas</strong>
                <span>
                  {knockoutMatches.filter((match) => match.stage === "QUARTERFINAL" && match.winnerPairId !== null).length}/
                  {knockoutMatches.filter((match) => match.stage === "QUARTERFINAL").length} concluídas
                </span>
              </div>
              <div className="simple-item">
                <strong>Semifinais</strong>
                <span>
                  {knockoutMatches.filter((match) => match.stage === "SEMIFINAL" && match.winnerPairId !== null).length}/
                  {knockoutMatches.filter((match) => match.stage === "SEMIFINAL").length} concluídas
                </span>
              </div>
              <div className="simple-item">
                <strong>Final</strong>
                <span>
                  {knockoutMatches.filter((match) => match.stage === "FINAL" && match.winnerPairId !== null).length}/
                  {knockoutMatches.filter((match) => match.stage === "FINAL").length} concluída
                </span>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
