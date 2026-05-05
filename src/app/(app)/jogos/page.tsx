import { TimePickerInput } from "@/components/forms/time-picker-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import {
  generateMatchesAction,
  updateMatchCourtAction,
  updateMatchParticipantsAction,
  updateMatchResultAction,
  updateMatchScheduleAction
} from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de grupos",
  OCTOFINAL: "Oitavas de final",
  QUARTERFINAL: "Quartas de final",
  SEMIFINAL: "Semifinais",
  FINAL: "Final"
};

const courtNames = ["Agecon", "Origem", "Elaine"];

type Dashboard = Awaited<ReturnType<typeof getArenaDashboard>>;
type ActiveTournament = NonNullable<Dashboard["activeTournament"]>;
type MatchItem = ActiveTournament["matches"][number];
type PairItem = ActiveTournament["pairs"][number] | NonNullable<MatchItem["homePair"]>;

function getMatchStatus(match: MatchItem) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore} x ${match.awayScore}`;
  }

  if (!match.homePair || !match.awayPair) {
    return "Aguardando duplas";
  }

  return "Pendente";
}

function getStageSummary(matches: MatchItem[], stage: string) {
  const stageMatches = matches.filter((match) => match.stage === stage);
  const done = stageMatches.filter((match) => match.winnerPairId !== null).length;

  return {
    total: stageMatches.length,
    done
  };
}

function PairPhotoStack({ pair }: { pair: PairItem | null }) {
  if (!pair?.players?.length) {
    return null;
  }

  return (
    <span className="pair-photo-stack match-pair-photos" aria-hidden="true">
      {pair.players.map(({ player }) => (
        <span className="pair-player-photo" key={player.id}>
          {player.photoUrl ? <img src={player.photoUrl} alt="" /> : player.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}

function MatchTeam({ label, pair, winner }: { label: string; pair: PairItem | null; winner: boolean }) {
  return (
    <div className={`match-team-slot${winner ? " match-team-slot-winner" : ""}`}>
      <span className="match-team-label">{label}</span>
      <div className="match-team-name-row">
        <PairPhotoStack pair={pair} />
        <strong>{pair?.name ?? "A definir"}</strong>
      </div>
    </div>
  );
}

function MatchCard({ match, pairs }: { match: MatchItem; pairs: ActiveTournament["pairs"] }) {
  const canEditParticipants = match.stage !== "GROUP";

  return (
    <article className="match-card match-card-refined">
      <div className="match-card-top">
        <div className="match-copy">
          <span className="match-kicker">{match.group?.name ?? stageLabels[match.stage] ?? "Jogo"}</span>
          <strong>{match.label}</strong>
        </div>
        <span className={`match-status${match.winnerPair ? " match-status-done" : ""}`}>{getMatchStatus(match)}</span>
      </div>

      <div className="match-teams-grid">
        <MatchTeam label="Dupla 1" pair={match.homePair} winner={match.winnerPair?.id === match.homePair?.id} />
        <div className="match-versus-badge">x</div>
        <MatchTeam label="Dupla 2" pair={match.awayPair} winner={match.winnerPair?.id === match.awayPair?.id} />
      </div>

      <div className="match-card-meta match-card-meta-refined">
        <span>{match.scheduledTime ? `Horário: ${match.scheduledTime}` : "Horário não definido"}</span>
        <span>{match.courtName ? `Quadra: ${match.courtName}` : "Quadra não definida"}</span>
        <span>{match.winnerPair?.name ? `Vencedor: ${match.winnerPair.name}` : "Resultado pendente"}</span>
      </div>

      <div className="match-control-grid">
        {canEditParticipants ? (
          <form action={updateMatchParticipantsAction} className="match-action-panel">
            <input type="hidden" name="matchId" value={match.id} />
            <span className="match-action-title">Confronto</span>
            <select name="homePairId" defaultValue={match.homePairId ?? ""}>
              <option value="">Dupla 1</option>
              {pairs.map((pair) => (
                <option key={`${match.id}-${pair.id}-home`} value={pair.id}>
                  {pair.name}
                </option>
              ))}
            </select>
            <select name="awayPairId" defaultValue={match.awayPairId ?? ""}>
              <option value="">Dupla 2</option>
              {pairs.map((pair) => (
                <option key={`${match.id}-${pair.id}-away`} value={pair.id}>
                  {pair.name}
                </option>
              ))}
            </select>
            <SubmitButton label="Salvar confronto" pendingLabel="..." className="button" />
          </form>
        ) : null}

        <form action={updateMatchResultAction} className="match-action-panel">
          <input type="hidden" name="matchId" value={match.id} />
          <span className="match-action-title">Resultado</span>
          <div className="match-score-inputs">
            <input name="homeScore" type="number" min="0" defaultValue={match.homeScore ?? ""} />
            <span className="match-score-separator">x</span>
            <input name="awayScore" type="number" min="0" defaultValue={match.awayScore ?? ""} />
          </div>
          <SubmitButton label="Salvar resultado" pendingLabel="..." className="button button-primary" />
        </form>

        <form action={updateMatchCourtAction} className="match-action-panel">
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

        <form action={updateMatchScheduleAction} className="match-action-panel">
          <input type="hidden" name="matchId" value={match.id} />
          <span className="match-action-title">Horário</span>
          <TimePickerInput id={`${match.id}-scheduled-time`} name="scheduledTime" defaultValue={match.scheduledTime ?? ""} />
          <SubmitButton label="Salvar horário" pendingLabel="..." className="button" />
        </form>
      </div>
    </article>
  );
}

export default async function MatchesPage() {
  const auth = await requireModuleView("matches");
  const { activeTournament } = await getArenaDashboard(auth.arenaId);

  if (!activeTournament) {
    return (
      <div className="stack-md">
        <header className="page-header">
          <div className="stack-xs">
            <p className="eyebrow">Jogos</p>
            <h1>Confrontos e resultados</h1>
            <p className="muted">Crie um torneio para começar a gerar os jogos.</p>
          </div>
        </header>
        <SectionCard title="Nenhum torneio em andamento">
          <p className="muted">Crie um torneio para começar a gerar os jogos.</p>
        </SectionCard>
      </div>
    );
  }

  const matches = activeTournament.matches;
  const stageOrder = ["GROUP", "OCTOFINAL", "QUARTERFINAL", "SEMIFINAL", "FINAL"];
  const currentStage = stageOrder.find((stage) =>
    matches.some((match) => match.stage === stage && match.winnerPairId === null)
  ) ?? (matches.length ? "GROUP" : "NONE");
  const currentMatches = currentStage === "NONE" ? [] : matches.filter((match) => match.stage === currentStage);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Jogos</p>
          <h1>Confrontos e resultados</h1>
          <p className="muted">Acompanhe a fase atual, lance resultados e organize quadras e horários em poucos cliques.</p>
        </div>
      </header>

      <SectionCard title="Preparar jogos" description="Gere ou regenere os confrontos conforme os grupos e duplas cadastrados.">
        <div className="match-dashboard-head">
          <form action={generateMatchesAction}>
            <input type="hidden" name="tournamentId" value={activeTournament.id} />
            <SubmitButton label="Gerar jogos" pendingLabel="Gerando..." className="button button-primary" />
          </form>
          <div className="match-stage-summary">
            {stageOrder.map((stage) => {
              const summary = getStageSummary(matches, stage);
              return (
                <div className="simple-item" key={stage}>
                  <strong>{stageLabels[stage]}</strong>
                  <span>{summary.done}/{summary.total} concluídos</span>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={currentStage === "NONE" ? "Jogos do torneio" : stageLabels[currentStage]}
        description={currentMatches.length ? `${currentMatches.length} jogo(s) nesta etapa.` : "Os jogos aparecerão aqui quando forem gerados."}
      >
        {currentMatches.length ? (
          <div className="matches-stage-grid matches-stage-grid-refined">
            {currentMatches.map((match) => (
              <MatchCard key={match.id} match={match} pairs={activeTournament.pairs} />
            ))}
          </div>
        ) : (
          <p className="muted">Gere os jogos para começar o acompanhamento do torneio.</p>
        )}
      </SectionCard>
    </div>
  );
}
