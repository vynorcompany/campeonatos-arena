import Link from "next/link";
import { AutoSubmitForm } from "@/components/forms/auto-submit-form";
import { TimePickerInput } from "@/components/forms/time-picker-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import {
  generateMatchesAction,
  updateMatchCourtAction,
  updateMatchManualStatusAction,
  updateMatchTvVisibilityAction,
  updateMatchParticipantsAction,
  updateMatchResultAction,
  updateMatchScheduleAction
} from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard, getTournamentScheduleConflicts } from "@/lib/services/tournament";

const stageLabels: Record<string, string> = {
  GROUP: "Fase de grupos",
  OCTOFINAL: "Oitavas de final",
  QUARTERFINAL: "Quartas de final",
  SEMIFINAL: "Semifinais",
  FINAL: "Final"
};

const courtNames = ["Agecon", "Origem", "Elaine"];
const manualMatchStatusOptions = [
  { value: "WAITING", label: "Aguardando" },
  { value: "LIVE", label: "Jogo rolando" },
  { value: "FINISHED", label: "Encerrado" }
];

type Dashboard = Awaited<ReturnType<typeof getArenaDashboard>>;
type ActiveTournament = NonNullable<Dashboard["activeTournament"]>;
type MatchItem = ActiveTournament["matches"][number];
type PairItem = ActiveTournament["pairs"][number] | NonNullable<MatchItem["homePair"]>;

function getMatchStatus(match: MatchItem) {
  if (match.winnerPairId) return "Finalizado";
  if (match.manualStatus === "WAITING") return "Jogo aguardando";
  if (match.manualStatus === "LIVE") return "Jogo rodando";
  if (match.manualStatus === "FINISHED") return "Finalizado";
  if (match.homeScore !== null || match.awayScore !== null) return "Jogo rodando";
  if (!match.homePair || !match.awayPair) return "Aguardando duplas";
  return "Jogo aguardando";
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
        <div className="match-top-tools">
          <span className={`match-status${match.winnerPair ? " match-status-done" : ""}`}>{getMatchStatus(match)}</span>
          <AutoSubmitForm action={updateMatchTvVisibilityAction} className="match-tv-toggle-inline">
            <input type="hidden" name="matchId" value={match.id} />
            <label className="match-tv-toggle-label">
              <input type="checkbox" name="showOnTv" defaultChecked={match.showOnTv ?? true} />
              <span>Mostrar na TV?</span>
            </label>
            </AutoSubmitForm>
        </div>
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

        <AutoSubmitForm action={updateMatchCourtAction} className="match-action-panel">
          <input type="hidden" name="matchId" value={match.id} />
          <span className="match-action-title">Quadra</span>
          <div className="match-court-options">
            {courtNames.map((courtName) => (
              <label key={`${match.id}-${courtName}`} className="match-court-option">
                <input name="courtName" type="radio" value={courtName} defaultChecked={match.courtName === courtName} required />
                <span>{courtName}</span>
              </label>
            ))}
          </div></AutoSubmitForm>

        <AutoSubmitForm action={updateMatchScheduleAction} className="match-action-panel">
          <input type="hidden" name="matchId" value={match.id} />
          <span className="match-action-title">Horário</span>
          <TimePickerInput id={`${match.id}-scheduled-time`} name="scheduledTime" defaultValue={match.scheduledTime ?? ""} /></AutoSubmitForm>

        <AutoSubmitForm action={updateMatchManualStatusAction} className="match-action-panel">
          <input type="hidden" name="matchId" value={match.id} />
          <span className="match-action-title">Status manual</span>
          <select name="manualStatus" defaultValue={match.manualStatus ?? (match.winnerPairId ? "FINISHED" : "WAITING")}>
            {manualMatchStatusOptions.map((status) => (
              <option key={`${match.id}-${status.value}`} value={status.value}>
                {status.label}
              </option>
            ))}
          </select></AutoSubmitForm>

      </div>
    </article>
  );
}

type MatchesPageProps = {
  searchParams?: {
    tournamentId?: string;
    q?: string;
    fase?: string;
    grupo?: string;
    status?: string;
  };
};

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const auth = await requireModuleView("matches");
  const { activeTournament, activeTournaments } = await getArenaDashboard(auth.arenaId, searchParams?.tournamentId);

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
  const conflicts = await getTournamentScheduleConflicts(activeTournament.id, auth.arenaId);
  const stageOrder = ["GROUP", "OCTOFINAL", "QUARTERFINAL", "SEMIFINAL", "FINAL"];
  const selectedStage = stageOrder.includes(searchParams?.fase ?? "") ? searchParams?.fase ?? "ALL" : "ALL";
  const selectedGroup = searchParams?.grupo ?? "ALL";
  const selectedStatus = searchParams?.status ?? "ALL";
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const groups = Array.from(new Set(matches.map((match) => match.group?.name).filter(Boolean))) as string[];

  const currentStage = stageOrder.find((stage) =>
    matches.some((match) => match.stage === stage && match.winnerPairId === null)
  ) ?? (matches.length ? "GROUP" : "NONE");

  const filteredMatches = matches.filter((match) => {
    const matchStatus = getMatchStatus(match);
    const teams = `${match.homePair?.name ?? ""} ${match.awayPair?.name ?? ""}`.toLowerCase();
    const label = `${match.label} ${match.group?.name ?? ""} ${match.scheduledTime ?? ""}`.toLowerCase();

    if (query && !teams.includes(query) && !label.includes(query)) return false;
    if (selectedStage !== "ALL" && match.stage !== selectedStage) return false;
    if (selectedGroup !== "ALL" && (match.group?.name ?? "") !== selectedGroup) return false;
    if (selectedStatus === "LIVE") return matchStatus === "Jogo rodando";
    if (selectedStatus === "WAITING") return matchStatus === "Jogo aguardando" || matchStatus === "Aguardando duplas";
    if (selectedStatus === "DONE") return matchStatus === "Finalizado";
    if (selectedStatus === "NEXT") return matchStatus === "Jogo aguardando" && !!match.scheduledTime;
    return true;
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Jogos</p>
          <h1>Confrontos e resultados</h1>
          <p className="muted">Acompanhe a fase atual, lance resultados e organize quadras e horários em poucos cliques.</p>
        </div>
        {activeTournaments.length ? (
          <form method="get" className="section-actions">
            <select name="tournamentId" defaultValue={activeTournament?.id ?? ""} className="button" aria-label="Selecionar torneio">
              {activeTournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
            <SubmitButton label="Abrir torneio" pendingLabel="..." className="button" />
          </form>
        ) : null}
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

        <form method="get" className="grid-form" style={{ marginTop: "0.75rem" }}>
          <input type="hidden" name="tournamentId" value={activeTournament.id} />
          <div className="field">
            <label htmlFor="q">Pesquisar</label>
            <input id="q" name="q" type="search" defaultValue={searchParams?.q ?? ""} placeholder="Dupla, grupo, horário..." />
          </div>
          <div className="field">
            <label htmlFor="fase">Fase</label>
            <select id="fase" name="fase" defaultValue={selectedStage}>
              <option value="ALL">Todas</option>
              {stageOrder.map((stage) => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="grupo">Grupo</label>
            <select id="grupo" name="grupo" defaultValue={selectedGroup}>
              <option value="ALL">Todos</option>
              {groups.map((groupName) => <option key={groupName} value={groupName}>{groupName}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={selectedStatus}>
              <option value="ALL">Todos</option>
              <option value="WAITING">Aguardando</option>
              <option value="NEXT">Próximo jogo</option>
              <option value="LIVE">Rodando</option>
              <option value="DONE">Finalizado</option>
            </select>
          </div>
          <div className="form-full section-actions">
            <button type="submit" className="button button-primary">Aplicar filtros</button>
            <Link href={`/jogos?tournamentId=${activeTournament.id}`} className="button">Limpar</Link>
          </div>
        </form>
        {conflicts.length ? (
          <div className="form-hint-box" style={{ marginTop: "0.75rem" }}>
            <strong>Conflitos detectados na agenda</strong>
            <ul>
              {conflicts.map((conflict) => (
                <li key={`${conflict.playerId}-${conflict.scheduledTime}`}>
                  {conflict.scheduledTime}: {conflict.labels.join(" | ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title={selectedStage === "ALL" ? (currentStage === "NONE" ? "Jogos do torneio" : `Filtro em ${stageLabels[currentStage]}`) : stageLabels[selectedStage]}
        description={filteredMatches.length ? `${filteredMatches.length} jogo(s) filtrado(s).` : "Os jogos aparecerão aqui quando forem gerados."}
      >
        {filteredMatches.length ? (
          <div className="matches-stage-grid matches-stage-grid-refined">
            {filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} pairs={activeTournament.pairs} />
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum jogo encontrado com os filtros atuais.</p>
        )}
      </SectionCard>
    </div>
  );
}



