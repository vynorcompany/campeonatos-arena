import { CategoryTrioMatchPanel, type TrioGame, type TrioSide } from "./category-trio-match-panel";
import { ClientAvatar } from "@/components/players/client-avatar";
import { LeagueIcon } from "./league-icon";

import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./category-results-panel.utilities";
import Link from "next/link";
import { Fragment } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { LeagueMatchResultDialog } from "@/components/tournaments/league-match-result-dialog";
import {
  finishCategoryCompetitionAction,
  recordCategoryMatchResultAction,
  resetCategoryLeagueMatchResultAction,
  updateCategoryMatchScheduleAction,
  updateCategoryMatchStatusAction,
} from "@/lib/actions/category-competition";
import { getLeagueMatchBlock } from "@/lib/league/monthly-schedule";

type CompetitionMatch = {
  id: string;
  label: string;
  stage: string;
  roundOrder: number;
  courtName: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeSet1: number | null;
  awaySet1: number | null;
  homeSet2: number | null;
  awaySet2: number | null;
  homeSet3: number | null;
  awaySet3: number | null;
  manualStatus: string | null;
  leagueBlock: number | null;
  woReason: string | null;
  homePair: ({ id?: string; name: string; players?: TrioSide["players"] }) | null;
  awayPair: ({ id?: string; name: string; players?: TrioSide["players"] }) | null;
  winnerPair: { name: string } | null;
  trioGames?: TrioGame[];
};

type GameSort = "round" | "date" | "status";
type GameStatusFilter = "ALL" | "WAITING" | "SCHEDULED" | "LIVE" | "FINISHED";

const stageLabels: Record<string, string> = { GROUP: "Grupos", ROUND_OF_16: "Oitavas de final", QUARTERFINAL: "Quartas de final", SEMIFINAL: "Semifinal", FINAL: "Final", THIRD_PLACE: "Disputa de terceiro lugar" };

const statusPriority = {
  WAITING: 0,
  SCHEDULED: 1,
  LIVE: 2,
  FINISHED: 3,
} as const;

function getMatchStatus(match: CompetitionMatch) {
  if (match.winnerPair || match.manualStatus === "FINISHED") return "FINISHED";
  if (match.manualStatus === "LIVE") return "LIVE";
  if (!match.scheduledDate || !match.scheduledTime) return "WAITING";
  return match.manualStatus ?? "SCHEDULED";
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
    format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE" | "TRIO";
    status: string;
    pairs: Array<{
      id: string;
      name: string;
      playerNames?: string[];
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

function MatchPairIdentity({ names, fallback }: { names?: string[]; fallback: string }) {
 return <span className="tw:grid tw:min-w-0 tw:gap-1">{names?.length ? names.map((name,index)=><span key={`${name}-${index}`} className="tw:flex tw:min-w-0 tw:items-center tw:gap-2"><ClientAvatar name={name}/><span className="tw:break-words">{name}</span></span>) : <span>{fallback}</span>}</span>;
}

export function CategoryResultsPanel({
  tournamentId,
  categories,
  mode,
  sort = "round",
  statusFilter = "ALL",
  playerSearch = "",
  canManage,
  canRecordResults,
}: {
  tournamentId: string;
  categories: ResultCategory[];
  mode: "games" | "summary";
  sort?: GameSort;
  statusFilter?: GameStatusFilter;
  playerSearch?: string;
  canManage: boolean;
  canRecordResults: boolean;
}) {
  if (!categories.length) {
    return (
      <div className="empty-state">
        <h3>Nenhuma categoria disponível</h3>
        <p>Configure uma categoria para iniciar a operação.</p>
        {canManage ? <Link
          href={`/torneios/${tournamentId}?tab=categories`}
          className={viewStyles.button_button_primary}
        >
          Configurar categorias
        </Link> : null}
      </div>
    );
  }

  return (
    <div className={viewStyles.stack_md}>
      <>{categories.map((category) => {
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
        const orderedMatches = competition?.format === "LEAGUE"
          ? [...visibleMatches].sort((first, second) =>
              getLeagueMatchBlock(first) - getLeagueMatchBlock(second) ||
              first.roundOrder - second.roundOrder,
            )
          : visibleMatches;

        return (
          <article
            id={`category-${category.id}`}
            className={cx(`${viewStyles.section_card_stack_md_category_operation_panel} ${competition?.format === "LEAGUE" && mode === "games" ? viewStyles.league_games_panel : ""}`)}
            key={category.id}
          >
            <div className={cx(`${viewStyles.page_header} ${competition?.format === "LEAGUE" && mode === "games" ? viewStyles.league_games_hero : ""}`)}>
              <div className={viewStyles.stack_xs}>
                {categories.length > 1 ? <strong className="tw:text-sm">{category.name}</strong> : null}
                <p className={viewStyles.muted}>
                  {completedMatchCount}/{competition?.matches.length ?? 0} jogos
                  concluídos
                </p>
              </div>
              <StatusBadge status={competition?.status ?? "DRAFT"} />
            </div>

            {!competition ? (
              <p className={viewStyles.muted}>
                Configure a competição desta categoria primeiro.
              </p>
            ) : mode === "games" ? (
              <>
                {competition.status === "DRAFT" ? (
                  <p className={viewStyles.muted}>
                    Publique a tabela na etapa Duplas e grupos para liberar os
                    placares.
                  </p>
                ) : null}

                {competition.matches.length ? (
                  <>
                    <form method="get" className={cx(`${viewStyles.category_game_filter_toolbar} ${competition.format === "LEAGUE" ? viewStyles.league_games_filters : ""}`)}>
                      <input type="hidden" name="tab" value="games" />
                      <div className={viewStyles.category_game_filter_field}>
                        <label htmlFor={`game-sort-${category.id}`}>Ordenar jogos por</label>
                        <select id={`game-sort-${category.id}`} name="sort" defaultValue={sort}>
                          <option value="round">Rodada</option><option value="date">Data</option><option value="status">Status</option>
                        </select>
                      </div>
                      <div className={viewStyles.category_game_filter_field}>
                        <label htmlFor={`game-status-${category.id}`}>Exibir status</label>
                        <select id={`game-status-${category.id}`} name="status" defaultValue={statusFilter}>
                          <option value="ALL">Todos os status</option><option value="WAITING">Aguardando</option><option value="SCHEDULED">Agendados</option><option value="LIVE">Em andamento</option><option value="FINISHED">Finalizados</option>
                        </select>
                      </div>
                      <div className={viewStyles.category_game_filter_field_2}>
                        <label htmlFor={`game-player-${category.id}`}>Buscar jogador</label>
                        <input id={`game-player-${category.id}`} name="player" type="search" defaultValue={playerSearch} placeholder="Nome do atleta" />
                      </div>
                      <button className={viewStyles.button} type="submit">
                        Aplicar filtros
                      </button>
                    </form>
                  <div className="tw:grid tw:min-w-0 tw:gap-0"><div className="tw:grid tw:grid-cols-[minmax(90px,.7fr)_minmax(90px,.7fr)_minmax(0,2fr)_minmax(100px,.8fr)_32px] tw:gap-3 tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-[11px] tw:font-semibold tw:uppercase tw:text-white tw:viewport-760:hidden"><span>Data / horário</span><span>Fase / grupo</span><span>{competition.format === "TRIO" ? "Trios" : "Duplas"}</span><span>Placar / status</span><span className="tw:sr-only">Ações</span></div><div className={cx(`${viewStyles.category_game_list} ${competition.format === "LEAGUE" ? viewStyles.league_calendar_list : ""}`)}>
                    {orderedMatches.map((match, index) => {
                      const canRecord =
                        competition.status === "PUBLISHED" &&
                        match.homePair &&
                        match.awayPair;
                      const matchStatus = getMatchStatus(match);
                      const leagueBlock = getLeagueMatchBlock(match);
                      const startsLeagueWeek = competition.format === "LEAGUE" &&
                        (index === 0 || getLeagueMatchBlock(orderedMatches[index - 1]) !== leagueBlock);

                      return (
                        <Fragment key={match.id}>
                          {startsLeagueWeek ? (
                            <div className={viewStyles.league_week_divider}>
                              <div>

                                <strong>Semana {leagueBlock}</strong>
                              </div>
                              <small>{orderedMatches.filter((item) => getLeagueMatchBlock(item) === leagueBlock).length} jogos</small>
                            </div>
                          ) : null}
                        <div className={cx(`${viewStyles.category_game_row} ${competition.format === "LEAGUE" ? viewStyles.league_calendar_card : ""}`)}>
                          <div className={viewStyles.category_game_time}>
                            <span className={viewStyles.category_game_label}>Data e horário</span>
                            <strong>
                              {match.scheduledDate ?? "A definir"}
                              {match.scheduledTime
                                ? ` · ${match.scheduledTime}`
                                : ""}
                            </strong>
                          </div>
                          <div className={viewStyles.category_game_stage}>
                            <span className={viewStyles.category_game_label}>Fase / grupo</span>
                            <strong>{competition.format === "LEAGUE" ? `Semana ${leagueBlock}` : (stageLabels[match.stage] ?? match.stage)}</strong>
                            <span>{match.label}</span>
                          </div>
                          <div className={viewStyles.category_game_pairs}>
                            <span className={viewStyles.category_game_label}>{competition.format === "TRIO" ? "Trios" : "Duplas"}</span>
                            {competition.format === "LEAGUE" ? <span className={viewStyles.league_match_sides}><span><small className="tw:sr-only">Mandante</small><MatchPairIdentity names={competition.pairs.find(pair=>pair.id===match.homePair?.id)?.playerNames} fallback={match.homePair?.name ?? "A definir"}/></span><b>×</b><span><small className="tw:sr-only">Visitante</small><MatchPairIdentity names={competition.pairs.find(pair=>pair.id===match.awayPair?.id)?.playerNames} fallback={match.awayPair?.name ?? "A definir"}/></span></span> : <span>{match.homePair?.name ?? "A definir"} × {match.awayPair?.name ?? "A definir"}</span>}
                          </div>
                          <div className={viewStyles.category_game_result}>
                            <span className={viewStyles.category_game_label}>Placar / status</span>
                            <strong>
                              {match.homeScore ?? "–"} × {match.awayScore ?? "–"}
                            </strong>
                            <StatusBadge status={matchStatus} compact />
                            {match.woReason ? <small className={viewStyles.league_wo_badge}>W.O.</small> : null}
                            {canRecordResults && competition.format === "LEAGUE" && canRecord ? <LeagueMatchResultDialog match={match} /> : null}
                          </div>
                          {canManage || canRecordResults ? <details className="tw:min-w-0 tw:open:col-span-full tw:viewport-760:col-span-full"><summary className={`${ui.icon} tw:list-none tw:[&::-webkit-details-marker]:hidden`} aria-label={`Editar agendamento e status de ${match.label}`} title="Editar agendamento e status"><LeagueIcon name="edit"/></summary><div className={viewStyles.category_game_actions}>
                          {canRecordResults && competition.status === "PUBLISHED" && competition.format !== "TRIO" ? (
                            <form
                              action={updateCategoryMatchStatusAction}
                              className={viewStyles.category_game_form}
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
                                <option value="WAITING">Aguardando</option>
                                <option value="SCHEDULED" disabled={!match.scheduledDate || !match.scheduledTime}>Agendado</option>
                                <option value="LIVE">Em andamento</option>
                                <option value="FINISHED">Finalizado</option>
                              </select>
                              <SubmitButton
                                label="Salvar status"
                                pendingLabel="..."
                                className={viewStyles.button}
                              />
                            </form>
                          ) : null}
                          {canManage ? <form
                            action={updateCategoryMatchScheduleAction}
                            className={viewStyles.category_game_form}
                          >
                            <input
                              type="hidden"
                              name="matchId"
                              value={match.id}
                            />
                            <input type="hidden" name="courtName" value={match.courtName ?? ""} />
                            <label className={ui.field}>Data<input
                              name="scheduledDate"
                              type="date"
                              defaultValue={match.scheduledDate ?? ""}
                              aria-label={`Data de ${match.label}`}
                              required
                            />
                            </label><label className={ui.field}>Horário<input
                              name="scheduledTime"
                              type="time"
                              defaultValue={match.scheduledTime ?? ""}
                              aria-label={`Horário de ${match.label}`}
                              required
                            />
                            </label><SubmitButton
                              label="Salvar horário"
                              pendingLabel="..."
                              className={ui.success}
                            />
                          </form> : null}
                          {canManage ? <form
                            action={updateCategoryMatchScheduleAction}
                            className={viewStyles.category_game_form_2}
                          >
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="scheduledDate" value="" />
                            <input type="hidden" name="scheduledTime" value="" />
                            <SubmitButton
                              label="Limpar agendamento"
                              pendingLabel="..."
                              className={viewStyles.button}
                            />
                          </form> : null}
                          {canRecordResults && canRecord && competition.format !== "LEAGUE" && competition.format !== "TRIO" ? (
                            <form
                              action={recordCategoryMatchResultAction}
                              className={viewStyles.category_game_form}
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
                                className="tw:[width:76px]"
                              />
                              <span aria-hidden="true">×</span>
                              <input
                                name="awayScore"
                                type="number"
                                min="0"
                                defaultValue={match.awayScore ?? ""}
                                aria-label={`Placar de ${match.awayPair?.name}`}
                                required
                                className="tw:[width:76px]"
                              />
                              <SubmitButton
                                label={
                                  match.winnerPair
                                    ? "Atualizar resultado"
                                    : "Salvar resultado"
                                }
                                pendingLabel="..."
                                className={viewStyles.button}
                              />
                            </form>
                          ) : (
                            <span>
                              {match.homeScore ?? "–"} ×{" "}
                              {match.awayScore ?? "–"}
                            </span>
                          )}
                          {canRecordResults && competition.format === "LEAGUE" && match.winnerPair ? (
                            <form action={resetCategoryLeagueMatchResultAction} className={viewStyles.category_game_form_2}>
                              <input type="hidden" name="matchId" value={match.id} />
                              <SubmitButton label="Resetar resultado" pendingLabel="Resetando..." className={viewStyles.button} />
                            </form>
                          ) : null}
                          </div></details> : null}
                          {competition.format === "TRIO" && match.homePair && match.awayPair ? <CategoryTrioMatchPanel matchId={match.id} games={match.trioGames ?? []} home={{ ...match.homePair, players: match.homePair.players ?? [] }} away={{ ...match.awayPair, players: match.awayPair.players ?? [] }} canRecordResults={Boolean(canRecordResults && canRecord)} /> : null}
                        </div>
                        </Fragment>
                      );
                    })}
                  </div></div>
                  </>
                ) : (
                  <p className={viewStyles.muted}>Nenhum jogo publicado.</p>
                )}
                {!visibleMatches.length && competition.matches.length ? (
                  <p className={viewStyles.muted}>Nenhum jogo encontrado para este status.</p>
                ) : null}
              </>
            ) : (
              <>
                {competition.format === "LEAGUE" ? (
                  competition.sportsResults.leagueStandings.length ? (
                    <div className={viewStyles.group_standings}>
                      <h4>Classificação da Liga</h4>
                      <div className="tw:min-w-0 tw:max-w-full tw:overflow-x-auto tw:focus-visible:outline-2 tw:focus-visible:outline-[#1e5ea8]" role="region" aria-label="Classificação da Liga" tabIndex={0}><table className={`${viewStyles.group_standings_table} tw:min-w-[560px] tw:max-[620px]:min-w-0! tw:max-[620px]:[&_thead]:sr-only tw:max-[620px]:[&_tbody]:block tw:max-[620px]:[&_tbody_tr]:grid tw:max-[620px]:[&_tbody_tr]:grid-cols-4 tw:max-[620px]:[&_tbody_tr]:gap-y-1 tw:max-[620px]:[&_tbody_tr]:border-b tw:max-[620px]:[&_tbody_tr]:border-[#d5dfeb] tw:max-[620px]:[&_tbody_tr]:py-3 tw:max-[620px]:[&_td]:border-0 tw:max-[620px]:[&_td]:min-w-0 tw:max-[620px]:[&_td:nth-child(2)]:col-span-3 tw:max-[620px]:[&_td:nth-child(n+3)::before]:content-[attr(data-label)] tw:max-[620px]:[&_td:nth-child(n+3)::before]:block tw:max-[620px]:[&_td:nth-child(n+3)::before]:text-[11px] tw:max-[620px]:[&_td:nth-child(n+3)::before]:text-[#465c75]`}>
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
                                <td data-label="Posição">{standing.position}</td>
                                <td data-label="Dupla">{standing.pairName}</td>
                                <td data-label="Jogos">{standing.matches}</td>
                                <td data-label="Vitórias">{standing.victories}</td>
                                <td data-label="Derrotas">{standing.losses}</td>
                                <td data-label="Saldo">{standing.differential}</td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table></div>
                    </div>
                  ) : (
                    <p className={viewStyles.muted}>Nenhum resultado registrado.</p>
                  )
                ) : competition.sportsResults.knockoutPlacement.length ? (
                  <div className={viewStyles.simple_list}>
                    {competition.sportsResults.knockoutPlacement.map(
                      (placement) => (
                        <div className={viewStyles.simple_item} key={placement.position}>
                          <strong>
                            {placement.position}. {placement.pairName}
                          </strong>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className={viewStyles.muted}>
                    A classificação final estará disponível após a final.
                  </p>
                )}

                {canManage && competition.status === "PUBLISHED" ? (
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
                        className={viewStyles.button_button_primary}
                      />
                    </form>
                  ) : (
                    <p className={viewStyles.muted}>
                      Conclua todos os jogos para encerrar a categoria.
                    </p>
                  )
                ) : null}
              </>
            )}
          </article>
        );
      })}</>
    </div>
  );
}
