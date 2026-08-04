import Link from "next/link";
import type { ArenaPublicStandings } from "@/lib/services/public-standings";

const statusLabels = {
  SCHEDULED: "Agendado",
  LIVE: "Em andamento",
  FINISHED: "Finalizado",
} as const;

export function PublicStandings({
  data,
}: {
  data: ArenaPublicStandings;
}) {
  const isRanking = data.selectedTab === "ranking";

  return (
    <main
      className="stack-md public-standings-page"
    >
      <header className="public-standings-header public-standings-brand-band">
        <div className="stack-xs public-standings-header-content">
          {data.arena.logoUrl ? (
            <img
              className="public-standings-logo"
              src={data.arena.logoUrl}
              alt={`Logo da arena ${data.arena.name}`}
              width={96}
              height={96}
            />
          ) : null}
          <h1>Arena Padel — Classificação e Rankings</h1>
          <p className="public-standings-header-support">
            Acompanhe as classificações e os jogos da arena.
          </p>
        </div>
      </header>

      <nav className="public-standings-tabs" aria-label="Visualização pública">
        <Link
          href="?tab=ranking"
          className={`button ${isRanking ? "button-primary" : ""}`}
          aria-current={isRanking ? "page" : undefined}
        >
          Ranking
        </Link>
        <Link
          href="?tab=games"
          className={`button ${!isRanking ? "button-primary" : ""}`}
          aria-current={!isRanking ? "page" : undefined}
        >
          Jogos
        </Link>
      </nav>

      {isRanking ? (
        <>
          {data.options.length ? (
            <form method="get" className="public-standings-filter">
              <input type="hidden" name="tab" value="ranking" />
              <label className="public-standings-filter-label" htmlFor="public-standings-view">Ranking</label>
              <select
                id="public-standings-view"
                name="view"
                defaultValue={data.selectedOptionId ?? undefined}
              >
                {data.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button className="button" type="submit">
                Consultar
              </button>
            </form>
          ) : (
            <section className="empty-state">
              <h2>Nenhuma classificação publicada</h2>
              <p>
                O Ranking Geral e as categorias encerradas aparecerão aqui
                quando forem publicados pela arena.
              </p>
            </section>
          )}

          {data.selected?.kind === "GENERAL_RANKING" ? (
            <section className="section-card stack-md">
              <div className="stack-xs">
                <h2>Ranking Geral</h2>
              </div>
              {data.selected.rows.length ? (
                <div className="group-standings">
                  <table className="group-standings-table">
                    <thead>
                      <tr>
                        <th>Posição</th><th>Atleta</th><th>Pontos</th><th>Eventos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.selected.rows.map((row) => (
                        <tr key={`${row.position}-${row.playerName}`}>
                          <td>{row.position}</td><td>{row.playerName}</td>
                          <td>{row.points}</td><td>{row.tournamentsPlayed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="muted">Nenhuma pontuação publicada neste ciclo.</p>}
            </section>
          ) : null}

          {data.selected?.kind === "CATEGORY" ? (
            <section className="section-card stack-md">
              <div className="stack-xs">
                <p className="eyebrow">{data.selected.eventName}</p>
                <h2>{data.selected.categoryName}</h2>
              </div>
              {data.selected.format === "LEAGUE" ? (
                <>
                <div className="group-standings">
                  <h3>Classificação da Liga</h3>
                  <table className="group-standings-table">
                    <thead><tr><th>Posição</th><th>Dupla</th><th>Jogos</th><th>Vitórias</th><th>Derrotas</th><th>Saldo</th></tr></thead>
                    <tbody>{data.selected.leagueStandings.map((standing) => (
                      <tr key={standing.position}>
                        <td>{standing.position}</td><td>{standing.pairName}</td><td>{standing.matches}</td>
                        <td>{standing.victories}</td><td>{standing.losses}</td><td>{standing.differential}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="public-standing-mobile-list">
                  {data.selected.leagueStandings.map((standing) => (
                    <article className="public-standing-mobile-card" key={standing.position}>
                      <strong className="public-standing-position">{standing.position}</strong>
                      <div>
                        <strong>{standing.pairName}</strong>
                        <p>{standing.matches} jogos · {standing.victories} Vitórias · {standing.losses} derrotas</p>
                      </div>
                      <div className="public-standing-differential"><span>Saldo</span><strong>{standing.differential}</strong></div>
                    </article>
                  ))}
                </div>
                </>
              ) : (
                <div className="stack-sm">
                  <h3>Colocação final</h3>
                  {data.selected.knockoutPlacement.map((placement) => (
                    <div className="simple-item" key={placement.position}>
                      <strong>{placement.position}. {placement.pairName}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <section className="section-card stack-md">
          <div className="stack-xs">
            <p className="eyebrow">Agenda pública</p>
            <h2>Jogos</h2>
          </div>
          <form method="get" className="public-games-filter">
            <input type="hidden" name="tab" value="games" />
            <div>
              <label className="public-standings-filter-label" htmlFor="public-games-league">Liga</label>
              <select id="public-games-league" name="league" defaultValue={data.selectedGameCategoryId ?? ""}>
                <option value="">Todas as ligas</option>
                {data.gameCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="public-standings-filter-label" htmlFor="public-games-status">Status</label>
              <select id="public-games-status" name="status" defaultValue={data.selectedGameStatus}>
                <option value="ALL">Todos</option>
                <option value="SCHEDULED">Agendados</option>
                <option value="LIVE">Em andamento</option>
                <option value="FINISHED">Finalizados</option>
              </select>
            </div>
            <button className="button button-primary" type="submit">Filtrar</button>
          </form>
          {data.games.length ? data.games.map((day) => (
            <div className="stack-sm" key={day.date}>
              <h3>{day.label}</h3>
              {day.games.map((game) => (
                <div className="simple-item public-game-item" key={`${day.date}-${game.label}-${game.roundOrder}-${game.categoryName}`}>
                  <strong>{game.scheduledTime ?? "Horário a definir"}</strong>
                  <span>{game.eventName} · {game.categoryName}{game.stage ? ` · ${game.stage}` : ""}</span>
                  {game.status === "FINISHED" && game.finalScore ? (
                    <div className="public-game-matchup">
                      <span>{game.homePairName}</span>
                      <div
                        className="public-game-score"
                        aria-label={`Placar final: ${game.finalScore.homeScore} a ${game.finalScore.awayScore}`}
                      >
                        <strong>
                          {game.finalScore.homeScore} × {game.finalScore.awayScore}
                        </strong>
                        {game.setScores?.length ? (
                          <span className="public-game-set-scores">
                            {game.setScores
                              .map(
                                (set) => `${set.homeScore}–${set.awayScore}`,
                              )
                              .join(" · ")}
                          </span>
                        ) : null}
                      </div>
                      <span>{game.awayPairName}</span>
                    </div>
                  ) : (
                    <span>{game.homePairName} × {game.awayPairName}</span>
                  )}
                  <span className="muted">{statusLabels[game.status]}</span>
                </div>
              ))}
            </div>
          )) : <p className="muted">Nenhum jogo encontrado com estes filtros.</p>}
        </section>
      )}
    </main>
  );
}
