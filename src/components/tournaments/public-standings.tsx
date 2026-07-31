import type { ArenaPublicStandings } from "@/lib/services/public-standings";

export function PublicStandings({
  data,
}: {
  data: ArenaPublicStandings;
}) {
  return (
    <main
      className="stack-md"
      style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px" }}
    >
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">{data.arena.name}</p>
          <h1>Classificação pública</h1>
          <p className="muted">
            Consulte o Ranking Geral ou o resultado final das categorias
            publicadas pela arena.
          </p>
        </div>
        {data.arena.logoUrl ? (
          <img
            src={data.arena.logoUrl}
            alt={`Logo da arena ${data.arena.name}`}
            width={64}
            height={64}
          />
        ) : null}
      </header>

      {data.options.length ? (
        <form method="get" className="section-card field-inline">
          <label htmlFor="public-standings-view">Classificação</label>
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
          <button className="button button-primary" type="submit">
            Consultar
          </button>
        </form>
      ) : (
        <section className="empty-state">
          <h2>Nenhuma classificação publicada</h2>
          <p>
            O Ranking Geral e as categorias encerradas aparecerão aqui quando
            forem publicados pela arena.
          </p>
        </section>
      )}

      {data.selected?.kind === "GENERAL_RANKING" ? (
        <section className="section-card stack-md">
          <div className="stack-xs">
            <p className="eyebrow">Ranking Geral</p>
            <h2>{data.selected.rankingName}</h2>
          </div>
          {data.selected.rows.length ? (
            <div className="group-standings">
              <table className="group-standings-table">
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Atleta</th>
                    <th>Pontos</th>
                    <th>Eventos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.selected.rows.map((row) => (
                    <tr key={`${row.position}-${row.playerName}`}>
                      <td>{row.position}</td>
                      <td>{row.playerName}</td>
                      <td>{row.points}</td>
                      <td>{row.tournamentsPlayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Nenhuma pontuação publicada neste ciclo.</p>
          )}
        </section>
      ) : null}

      {data.selected?.kind === "CATEGORY" ? (
        <section className="section-card stack-md">
          <div className="stack-xs">
            <p className="eyebrow">{data.selected.eventName}</p>
            <h2>{data.selected.categoryName}</h2>
          </div>

          {data.selected.format === "LEAGUE" ? (
            <div className="group-standings">
              <h3>Classificação da Liga</h3>
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
                  {data.selected.leagueStandings.map((standing) => (
                    <tr key={standing.position}>
                      <td>{standing.position}</td>
                      <td>{standing.pairName}</td>
                      <td>{standing.matches}</td>
                      <td>{standing.victories}</td>
                      <td>{standing.losses}</td>
                      <td>{standing.differential}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="stack-sm">
              <h3>Colocação final</h3>
              {data.selected.knockoutPlacement.map((placement) => (
                <div className="simple-item" key={placement.position}>
                  <strong>
                    {placement.position}. {placement.pairName}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="section-card stack-md">
        <div className="stack-xs">
          <p className="eyebrow">Agenda pÃºblica</p>
          <h2>PrÃ³ximos jogos</h2>
        </div>
        {data.upcomingGames.length ? (
          data.upcomingGames.map((day) => (
            <div className="stack-sm" key={day.date}>
              <h3>{day.label}</h3>
              {day.games.map((game) => (
                <div
                  className="simple-item"
                  key={`${day.date}-${game.scheduledTime}-${game.eventName}-${game.categoryName}-${game.label}-${game.roundOrder}`}
                >
                  <strong>{game.scheduledTime}</strong>
                  <span>
                    {game.eventName} Â· {game.categoryName}
                    {game.stage ? ` Â· ${game.stage}` : ""}
                  </span>
                  <span>
                    {game.homePairName} Ã— {game.awayPairName}
                  </span>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p className="muted">Nenhum jogo agendado.</p>
        )}
      </section>
    </main>
  );
}
