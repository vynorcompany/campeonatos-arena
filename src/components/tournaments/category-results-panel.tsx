import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import {
  finishCategoryCompetitionAction,
  recordCategoryMatchResultAction,
  updateCategoryMatchScheduleAction,
  updateCategoryMatchStatusAction,
} from "@/lib/actions/category-competition";

type CompetitionMatch = {
  id: string;
  label: string;
  stage: string;
  roundOrder: number;
  scheduledDate: string | null;
  scheduledTime: string | null;
  homeScore: number | null;
  awayScore: number | null;
  manualStatus: string | null;
  homePair: { name: string } | null;
  awayPair: { name: string } | null;
  winnerPair: { name: string } | null;
};

type GameSort = "round" | "date" | "status";
type GameStatusFilter = "ALL" | "SCHEDULED" | "LIVE" | "FINISHED";

const statusPriority = {
  SCHEDULED: 0,
  LIVE: 1,
  FINISHED: 2,
} as const;

function getMatchStatus(match: CompetitionMatch) {
  return match.manualStatus ?? (match.winnerPair ? "FINISHED" : "SCHEDULED");
}

function compareByDate(first: CompetitionMatch, second: CompetitionMatch) {
  const firstDate = first.scheduledDate
    ? `${first.scheduledDate}T${first.scheduledTime ?? "23:59"}`
    : "9999-12-31T23:59";
  const secondDate = second.scheduledDate
    ? `${second.scheduledDate}T${second.scheduledTime ?? "23:59"}`
    : "9999-12-31T23:59";
  return firstDate.localeCompare(secondDate) || first.roundOrder - second.roundOrder;
}

function sortMatches(matches: CompetitionMatch[], sort: GameSort) {
  return [...matches].sort((first, second) => {
    if (sort === "date") {
      return compareByDate(first, second);
    }
    if (sort === "status") {
      return (
        statusPriority[getMatchStatus(first) as keyof typeof statusPriority] -
          statusPriority[getMatchStatus(second) as keyof typeof statusPriority] ||
        compareByDate(first, second)
      );
    }
    return first.roundOrder - second.roundOrder;
  });
}

type ResultCategory = {
  id: string;
  name: string;
  competition: {
    id: string;
    format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE";
    status: string;
    pairs: Array<{
      id: string;
      name: string;
    }>;
    matches: CompetitionMatch[];
    sportsResults: {
      leagueStandings: Array<{
        position: number;
        pairName: string;
        matches: number;
        victories: number;
        losses: number;
        differential: number;
      }>;
      knockoutPlacement: Array<{
        position: number;
        pairName: string;
      }>;
    };
  } | null;
};

export function CategoryResultsPanel({
  tournamentId,
  categories,
  mode,
  sort = "round",
  statusFilter = "ALL",
  playerSearch = "",
}: {
  tournamentId: string;
  categories: ResultCategory[];
  mode: "games" | "summary";
  sort?: GameSort;
  statusFilter?: GameStatusFilter;
  playerSearch?: string;
}) {
  if (!categories.length) {
    return (
      <div className="empty-state">
        <h3>Nenhuma categoria disponível</h3>
        <p>Configure uma categoria para iniciar a operação.</p>
        <Link
          href={`/torneios/${tournamentId}?tab=categories`}
          className="button button-primary"
        >
          Configurar categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-md">
      {categories.map((category) => {
        const competition = category.competition;
        const completedMatchCount =
          competition?.matches.filter((match) => match.winnerPair).length ?? 0;
        const allMatchesCompleted =
          Boolean(competition?.matches.length) &&
          completedMatchCount === competition?.matches.length;
        const visibleMatches = competition
          ? sortMatches(
              competition.matches.filter((match) => {
                const playerQuery = playerSearch.toLocaleLowerCase("pt-BR");
                const pairNames = `${match.homePair?.name ?? ""} ${match.awayPair?.name ?? ""}`
                  .toLocaleLowerCase("pt-BR");
                return (
                  (statusFilter === "ALL" || getMatchStatus(match) === statusFilter) &&
                  (!playerQuery || pairNames.includes(playerQuery))
                );
              }),
              sort,
            )
          : [];

        return (
          <article
            id={`category-${category.id}`}
            className="section-card stack-md"
            key={category.id}
          >
            <div className="page-header">
              <div className="stack-xs">
                <h3>{category.name}</h3>
                <p className="muted">
                  {completedMatchCount}/{competition?.matches.length ?? 0} jogos
                  concluídos
                </p>
              </div>
              <StatusBadge status={competition?.status ?? "DRAFT"} />
            </div>

            {!competition ? (
              <p className="muted">
                Configure a competição desta categoria primeiro.
              </p>
            ) : mode === "games" ? (
              <>
                {competition.status === "DRAFT" ? (
                  <p className="muted">
                    Publique a tabela na etapa Duplas e grupos para liberar os
                    placares.
                  </p>
                ) : null}

                {competition.matches.length ? (
                  <>
                    <form method="get" className="category-game-filter-toolbar">
                      <input type="hidden" name="tab" value="games" />
                      <div className="category-game-filter-field">
                        <label htmlFor={`game-sort-${category.id}`}>Ordenar jogos por</label>
                        <select id={`game-sort-${category.id}`} name="sort" defaultValue={sort}>
                          <option value="round">Rodada</option><option value="date">Data</option><option value="status">Status</option>
                        </select>
                      </div>
                      <div className="category-game-filter-field">
                        <label htmlFor={`game-status-${category.id}`}>Exibir status</label>
                        <select id={`game-status-${category.id}`} name="status" defaultValue={statusFilter}>
                          <option value="ALL">Todos os status</option><option value="SCHEDULED">Agendados</option><option value="LIVE">Em andamento</option><option value="FINISHED">Finalizados</option>
                        </select>
                      </div>
                      <div className="category-game-filter-field category-game-filter-search">
                        <label htmlFor={`game-player-${category.id}`}>Buscar jogador</label>
                        <input id={`game-player-${category.id}`} name="player" type="search" defaultValue={playerSearch} placeholder="Nome do atleta" />
                      </div>
                      <button className="button" type="submit">
                        Aplicar filtros
                      </button>
                    </form>
                  <div className="category-game-list">
                    {visibleMatches.map((match) => {
                      const canRecord =
                        competition.status === "PUBLISHED" &&
                        match.homePair &&
                        match.awayPair;
                      const matchStatus = getMatchStatus(match);

                      return (
                        <div className="category-game-row" key={match.id}>
                          <div className="category-game-time">
                            <span className="category-game-label">Data e horário</span>
                            <strong>
                              {match.scheduledDate ?? "A definir"}
                              {match.scheduledTime
                                ? ` · ${match.scheduledTime}`
                                : ""}
                            </strong>
                          </div>
                          <div className="category-game-stage">
                            <span className="category-game-label">Fase / grupo</span>
                            <strong>{match.stage}</strong>
                            <span>{match.label}</span>
                          </div>
                          <div className="category-game-pairs">
                            <span className="category-game-label">Duplas</span>
                            <span>
                              {match.homePair?.name ?? "A definir"} ×{" "}
                              {match.awayPair?.name ?? "A definir"}
                            </span>
                          </div>
                          <div className="category-game-result">
                            <span className="category-game-label">Placar / status</span>
                            <strong>
                              {match.homeScore ?? "–"} × {match.awayScore ?? "–"}
                            </strong>
                            <StatusBadge status={matchStatus} />
                          </div>
                          <div className="category-game-actions">
                          {competition.status === "PUBLISHED" ? (
                            <form
                              action={updateCategoryMatchStatusAction}
                              className="field-inline category-game-form"
                            >
                              <input
                                type="hidden"
                                name="matchId"
                                value={match.id}
                              />
                              <select
                                name="status"
                                defaultValue={matchStatus}
                                aria-label={`Status de ${match.label}`}
                              >
                                <option value="SCHEDULED">Agendado</option>
                                <option value="LIVE">Em andamento</option>
                                <option value="FINISHED">Finalizado</option>
                              </select>
                              <SubmitButton
                                label="Salvar status"
                                pendingLabel="..."
                                className="button"
                              />
                            </form>
                          ) : null}
                          <form
                            action={updateCategoryMatchScheduleAction}
                            className="field-inline category-game-form"
                          >
                            <input
                              type="hidden"
                              name="matchId"
                              value={match.id}
                            />
                            <input
                              name="scheduledDate"
                              type="date"
                              defaultValue={match.scheduledDate ?? ""}
                              aria-label={`Data de ${match.label}`}
                              required
                            />
                            <input
                              name="scheduledTime"
                              type="time"
                              defaultValue={match.scheduledTime ?? ""}
                              aria-label={`Horário de ${match.label}`}
                              required
                            />
                            <SubmitButton
                              label="Salvar horário"
                              pendingLabel="..."
                              className="button"
                            />
                          </form>
                          {canRecord ? (
                            <form
                              action={recordCategoryMatchResultAction}
                              className="field-inline category-game-form"
                            >
                              <input
                                type="hidden"
                                name="matchId"
                                value={match.id}
                              />
                              <input
                                name="homeScore"
                                type="number"
                                min="0"
                                defaultValue={match.homeScore ?? ""}
                                aria-label={`Placar de ${match.homePair?.name}`}
                                required
                                style={{ width: "76px" }}
                              />
                              <span aria-hidden="true">×</span>
                              <input
                                name="awayScore"
                                type="number"
                                min="0"
                                defaultValue={match.awayScore ?? ""}
                                aria-label={`Placar de ${match.awayPair?.name}`}
                                required
                                style={{ width: "76px" }}
                              />
                              <SubmitButton
                                label={
                                  match.winnerPair
                                    ? "Atualizar resultado"
                                    : "Salvar resultado"
                                }
                                pendingLabel="..."
                                className="button"
                              />
                            </form>
                          ) : (
                            <span>
                              {match.homeScore ?? "–"} ×{" "}
                              {match.awayScore ?? "–"}
                            </span>
                          )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                ) : (
                  <p className="muted">Nenhum jogo publicado.</p>
                )}
                {!visibleMatches.length && competition.matches.length ? (
                  <p className="muted">Nenhum jogo encontrado para este status.</p>
                ) : null}
              </>
            ) : (
              <>
                {competition.format === "LEAGUE" ? (
                  competition.sportsResults.leagueStandings.length ? (
                    <div className="group-standings">
                      <h4>Classificação da Liga</h4>
                      <table className="group-standings-table">
                        <thead>
                          <tr>
                            <th>Posição</th>
                            <th>Dupla</th>
                            <th>Jogos</th>
                            <th>Vitórias</th>
                            <th>Derrotas</th>
                            <th>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competition.sportsResults.leagueStandings.map(
                            (standing) => (
                              <tr key={standing.pairName}>
                                <td>{standing.position}</td>
                                <td>{standing.pairName}</td>
                                <td>{standing.matches}</td>
                                <td>{standing.victories}</td>
                                <td>{standing.losses}</td>
                                <td>{standing.differential}</td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="muted">Nenhum resultado registrado.</p>
                  )
                ) : competition.sportsResults.knockoutPlacement.length ? (
                  <div className="simple-list">
                    {competition.sportsResults.knockoutPlacement.map(
                      (placement) => (
                        <div className="simple-item" key={placement.position}>
                          <strong>
                            {placement.position}. {placement.pairName}
                          </strong>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="muted">
                    A classificação final estará disponível após a final.
                  </p>
                )}

                {competition.status === "PUBLISHED" ? (
                  allMatchesCompleted ? (
                    <form action={finishCategoryCompetitionAction}>
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <SubmitButton
                        label="Encerrar categoria"
                        pendingLabel="Encerrando..."
                        className="button button-primary"
                      />
                    </form>
                  ) : (
                    <p className="muted">
                      Conclua todos os jogos para encerrar a categoria.
                    </p>
                  )
                ) : null}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
