import { cx } from "@/lib/ui/classes";
import { viewStyles } from "@/components/tournaments/public-standings.utilities";
import { PortalLocalTabs } from "./local-tabs";
import { PublicLeaguePortal } from "@/components/tournaments/public-league-portal";
import { RankingCategorySelect } from "@/components/ranking-category-select";
import type { ArenaPublicStandings } from "@/lib/services/public-standings";
import type { LeagueTab } from "@/lib/portal/navigation";
type Portal = Awaited<
  ReturnType<
    typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal
  >
>;

export function PortalTournamentTabs({
  arenaSlug,
  playerName,
  portal,
  data,
  initial = "games",
}: {
  arenaSlug: string;
  playerName: string;
  portal: Portal;
  data: ArenaPublicStandings | null;
  initial?: LeagueTab;
}) {
  const league = (view: "games" | "pairs") =>
    portal ? (
      <PublicLeaguePortal
        arenaSlug={arenaSlug}
        playerName={playerName}
        portal={portal}
        view={view}
        showPrize={false}
      />
    ) : (
      <p role="status">Não foi possível carregar os torneios neste momento.</p>
    );
  return (
    <PortalLocalTabs
      key={`${arenaSlug}:${initial}`}
      hashTabs={{ "jogo-": "games", "desafio-": "games" }}
      label="Menu da Liga"
      initial={initial}
      tabs={[
        { id: "games", label: "Jogos", content: league("games") },
        { id: "pairs", label: "Duplas", content: league("pairs") },
        {
          id: "ranking",
          label: "Ranking",
          content: data ? (
            <RankingPanel arenaSlug={arenaSlug} data={data} />
          ) : null,
        },
        {
          id: "rules",
          label: "Regras",
          content: data ? <RulesPanel data={data} /> : null,
        },
        {
          id: "prizes",
          label: "Premiação",
          content: <PrizePanel portal={portal} />,
        },
      ]}
    />
  );
}

function PrizePanel({ portal }: { portal: Portal }) {
  return (
    <>
      <section className="tw:mx-3 tw:hidden tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-4 tw:viewport-700:block tw:dark:border-[#3e5e8b] tw:dark:bg-[#10294c]">
        <h2 className="tw:mb-3 tw:text-lg tw:font-semibold">Premiação</h2>
        {portal?.prizes.length ? (
          <div className="tw:grid tw:gap-2">
            {portal.prizes.map((prize) => (
              <article
                key={prize.id}
                className="tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#2a4161] tw:dark:bg-[#102441]"
              >
                <strong className="tw:block tw:text-sm">
                  {prize.categoryName}
                </strong>
                <small className="tw:block tw:text-xs tw:text-[#606874] tw:dark:text-[#a4b3c8]">
                  {prize.eventName}
                </small>
                <p className="tw:mt-2 tw:text-sm">{prize.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="tw:text-sm tw:text-[#606874] tw:dark:text-[#a4b3c8]">
            A arena ainda não divulgou premiações.
          </p>
        )}
      </section>
      <section
        className={cx(
          viewStyles.portal_league_prize_podium,
          "tw:viewport-700:hidden!",
        )}
      >
        <div className={viewStyles.portal_league_prize_cup} aria-hidden="true">
          🏆
        </div>
        <div className={viewStyles.portal_league_prize_copy}>
          <span>PREMIAÇÃO DA LIGA</span>
          <h2>O pódio está à sua espera</h2>
          <p>Acompanhe a premiação dos seus torneios em tempo real.</p>
        </div>
        <div className={viewStyles.portal_league_prize_list}>
          {portal?.prizes.length ? (
            portal.prizes.map((prize) => (
              <article key={prize.id}>
                <strong>{prize.categoryName}</strong>
                <span>{prize.eventName}</span>
                <b className={viewStyles.portal_league_prize_description}>
                  {prize.description}
                </b>
              </article>
            ))
          ) : (
            <p>A arena ainda não divulgou a premiação dos seus torneios.</p>
          )}
        </div>
      </section>
    </>
  );
}

function RulesPanel({ data }: { data: ArenaPublicStandings }) {
  return (
    <section className={viewStyles.athlete_portal_content_panel}>
      <header>
        <span>REGULAMENTO</span>
        <h2>Regras dos Torneios</h2>
      </header>
      {data.leagueRules.length ? (
        data.leagueRules.map((league) => (
          <article className={viewStyles.portal_rule} key={league.id}>
            <strong>{league.categoryName}</strong>
            <p>{league.rules}</p>
          </article>
        ))
      ) : (
        <p className={viewStyles.muted}>
          Nenhuma regra foi publicada para os torneios ativos.
        </p>
      )}
    </section>
  );
}

function RankingPanel({
  arenaSlug,
  data,
}: {
  arenaSlug: string;
  data: ArenaPublicStandings;
}) {
  return (
    <section
      className={
        viewStyles.athlete_portal_content_panel_stack_md_portal_ranking_panel
      }
    >
      <header className={viewStyles.portal_ranking_heading}>
        <span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 20V11M12 20V4M19 20v-7" />
            <path d="M3 20h18" />
          </svg>
          CLASSIFICAÇÃO
        </span>
        <h2>Ranking da Liga</h2>
      </header>
      {data.options.length ? (
        <RankingCategorySelect
          arenaSlug={arenaSlug}
          options={data.options}
          selectedOptionId={data.selectedOptionId}
        />
      ) : null}
      {data.selected?.kind === "GENERAL_RANKING" ? (
        <>
          <div className="tw:hidden tw:viewport-700:grid tw:gap-2">
            {data.selected.rows.map((row) => (
              <article
                key={`${row.position}-${row.playerName}`}
                className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#2a4161] tw:dark:bg-[#102441]"
              >
                <b className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-white tw:text-xs tw:text-[#08387b] tw:dark:bg-[#1c3962] tw:dark:text-[#5b92de]">
                  {row.position}º
                </b>
                <span className="tw:min-w-0 tw:flex-1">
                  <strong className="tw:block tw:text-sm tw:text-[#133047] tw:dark:text-[#eaf3ff]">
                    {row.playerName}
                  </strong>
                  <small className="tw:text-xs tw:text-[#606874] tw:dark:text-[#a4b3c8]">
                    {row.tournamentsPlayed} eventos
                  </small>
                </span>
                <b className="tw:text-sm tw:text-[#08387b] tw:dark:text-[#5b92de]">
                  {row.points} pts
                </b>
              </article>
            ))}
          </div>
          <table
            className={cx(
              viewStyles.portal_ranking_table,
              "tw:viewport-700:hidden!",
            )}
          >
            <thead>
              <tr>
                <th>Pos.</th>
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
        </>
      ) : null}
      {data.selected?.kind === "CATEGORY" &&
      data.selected.format === "LEAGUE" ? (
        <>
          <div className="tw:hidden tw:viewport-700:grid tw:gap-2">
            {data.selected.leagueStandings.map((standing) => (
              <article
                key={standing.position}
                className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:p-3 tw:dark:border-[#2a4161] tw:dark:bg-[#102441]"
              >
                <b className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-white tw:text-xs tw:text-[#08387b] tw:dark:bg-[#1c3962] tw:dark:text-[#5b92de]">
                  {standing.position}º
                </b>
                <span className="tw:min-w-0 tw:flex-1">
                  <strong className="tw:block tw:text-sm tw:text-[#133047] tw:dark:text-[#eaf3ff]">
                    {standing.pairName}
                  </strong>
                  <small className="tw:text-xs tw:text-[#606874] tw:dark:text-[#a4b3c8]">
                    {standing.victories} vitórias · saldo{" "}
                    {standing.differential}
                  </small>
                </span>
                <b className="tw:text-sm tw:text-[#08387b] tw:dark:text-[#5b92de]">
                  {standing.points} pts
                </b>
              </article>
            ))}
          </div>
          <table
            className={cx(
              viewStyles.portal_ranking_table_2,
              "tw:viewport-700:hidden!",
            )}
          >
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Dupla</th>
                <th>Pts.</th>
                <th>
                  <span className="ranking-table-label-wide">Jogos</span>
                  <abbr
                    className={viewStyles.ranking_table_label_compact}
                    title="Jogos"
                  >
                    JG
                  </abbr>
                </th>
                <th>
                  <span className="ranking-table-label-wide">Vitórias</span>
                  <abbr
                    className={viewStyles.ranking_table_label_compact}
                    title="Vitórias"
                  >
                    V
                  </abbr>
                </th>
                <th>
                  <span className="ranking-table-label-wide">Derrotas</span>
                  <abbr
                    className={viewStyles.ranking_table_label_compact}
                    title="Derrotas"
                  >
                    D
                  </abbr>
                </th>
                <th>
                  <span className="ranking-table-label-wide">Saldo</span>
                  <abbr
                    className={viewStyles.ranking_table_label_compact}
                    title="Saldo"
                  >
                    SAL
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.selected.leagueStandings.map((standing) => (
                <tr key={standing.position}>
                  <td>{standing.position}</td>
                  <td>{standing.pairName}</td>
                  <td>{standing.points}</td>
                  <td>{standing.matches}</td>
                  <td>{standing.victories}</td>
                  <td>{standing.losses}</td>
                  <td>{standing.differential}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      {!data.selected ? (
        <p className={viewStyles.muted}>
          Nenhuma classificação publicada neste momento.
        </p>
      ) : null}
    </section>
  );
}
