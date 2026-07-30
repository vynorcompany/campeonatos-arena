import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import {
  finishCategoryCompetitionAction,
  recordCategoryMatchResultAction,
  updateCategoryMatchScheduleAction,
} from "@/lib/actions/category-competition";

type CompetitionMatch = {
  id: string;
  label: string;
  stage: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePair: { name: string } | null;
  awayPair: { name: string } | null;
  winnerPair: { name: string } | null;
};

type ResultCategory = {
  id: string;
  name: string;
  competition: {
    id: string;
    status: string;
    feedsGeneralRanking: boolean;
    rankingName: string | null;
    pairs: Array<{
      id: string;
      name: string;
      totalPoints: number;
    }>;
    matches: CompetitionMatch[];
  } | null;
};

export function CategoryResultsPanel({
  tournamentId,
  categories,
  mode,
}: {
  tournamentId: string;
  categories: ResultCategory[];
  mode: "games" | "summary";
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
                  <div className="simple-list">
                    {competition.matches.map((match) => {
                      const canRecord =
                        competition.status === "PUBLISHED" &&
                        match.homePair &&
                        match.awayPair;

                      return (
                        <div className="simple-item" key={match.id}>
                          <div className="match-copy">
                            <strong>{match.label}</strong>
                            <span>
                              {match.homePair?.name ?? "A definir"} ×{" "}
                              {match.awayPair?.name ?? "A definir"}
                            </span>
                          </div>
                          <form
                            action={updateCategoryMatchScheduleAction}
                            className="field-inline"
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
                              className="field-inline"
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
                                label={match.winnerPair ? "Atualizar" : "Salvar"}
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
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">Nenhum jogo publicado.</p>
                )}
              </>
            ) : (
              <>
                <dl className="t-review-grid">
                  <div>
                    <dt>Ranking de duplas</dt>
                    <dd>{competition.rankingName ?? "Sem ranking"}</dd>
                  </div>
                  <div>
                    <dt>Ranking Geral</dt>
                    <dd>
                      {competition.feedsGeneralRanking
                        ? "Recebe pontuação"
                        : "Não recebe pontuação"}
                    </dd>
                  </div>
                </dl>

                {competition.pairs.length ? (
                  <div className="simple-list">
                    {[...competition.pairs]
                      .sort((first, second) => {
                        if (second.totalPoints !== first.totalPoints) {
                          return second.totalPoints - first.totalPoints;
                        }
                        return first.name.localeCompare(second.name);
                      })
                      .map((pair, index) => (
                        <div className="simple-item" key={pair.id}>
                          <strong>
                            {index + 1}. {pair.name}
                          </strong>
                          <span>{pair.totalPoints} pts</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="muted">Nenhuma dupla classificada.</p>
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
                        label="Encerrar categoria e aplicar ranking"
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
