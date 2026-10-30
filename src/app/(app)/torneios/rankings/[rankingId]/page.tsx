import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingConfigurationForm } from "@/components/forms/ranking-configuration-form";
import { RankingPointsForm } from "@/components/forms/ranking-points-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import {
  RankingWorkspaceTabs,
  isRankingWorkspaceTab,
  type RankingWorkspaceTab,
} from "@/components/tournaments/ranking-workspace-tabs";
import { SectionCard } from "@/components/section-card";
import {
  createRankingCycleAction,
  resetRankingPointsAction,
} from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatRankingDateInput } from "@/lib/ranking/period";
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";

type RankingDetailPageProps = {
  params: Promise<{ rankingId: string }>;
  searchParams?: Promise<{
    tab?: string;
    period?: string;
    start?: string;
    end?: string;
    cycleId?: string;
  }>;
};

const periodPresets = [
  { id: "month", label: "Mês atual" },
  { id: "quarter", label: "Trimestre atual" },
  { id: "semester", label: "Semestre atual" },
  { id: "year", label: "Ano atual" },
] as const;

function formatTournamentStatus(status: string) {
  return ({
    DRAFT: "Rascunho",
    READY_FOR_DRAW: "Pronto para sorteio",
    GROUPS_DEFINED: "Grupos definidos",
    MATCHES_DEFINED: "Jogos definidos",
    FINISHED: "Finalizado",
  } as Record<string, string>)[status] ?? status;
}

function rankingHref(
  rankingId: string,
  tab: RankingWorkspaceTab,
  periodQuery: Record<string, string>,
) {
  const query = new URLSearchParams({ tab, ...periodQuery });
  return `/torneios/rankings/${rankingId}?${query.toString()}`;
}

function RankingLeaderboard({
  ranking,
}: {
  ranking: NonNullable<Awaited<ReturnType<typeof getRankingProfileLeaderboard>>>;
}) {
  const rows = ranking.type === "PAIR"
    ? ranking.pairLeaderboard.map((pair, index) => ({
        key: pair.pairKey,
        position: index + 1,
        name: pair.pairName,
        points: pair.points,
        participations: pair.competitionsPlayed,
        lastTournament: pair.lastTournamentName ?? "—",
      }))
    : ranking.leaderboard.map((player, index) => ({
        key: player.playerId,
        position: index + 1,
        name: player.playerName,
        points: player.points,
        participations: player.tournamentsPlayed,
        lastTournament: player.lastTournamentName ?? "—",
      }));
  if (!rows.length) {
    return <p className={viewStyles.muted}>Ainda não há participantes pontuados neste período.</p>;
  }

  return (
    <>
      <div className="tw:hidden tw:viewport-680:grid tw:gap-3" aria-label="Classificação">
        {rows.map((row) => (
          <article key={row.key} className="tw:min-w-0 tw:rounded-xl tw:border tw:border-[#d9e5f1] tw:bg-white tw:p-3">
            <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-3">
              <span className="tw:grid tw:size-9 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:bg-[#174983] tw:text-sm tw:font-bold tw:text-white">#{row.position}</span>
              <strong className="tw:min-w-0 tw:flex-1 tw:break-words tw:text-sm tw:leading-snug tw:text-[#102b50]">{row.name}</strong>
              <span className="tw:shrink-0 tw:text-sm tw:font-bold tw:text-[#15599e]">{row.points} pts</span>
            </div>
            <div className="tw:mt-3 tw:grid tw:gap-1 tw:border-t tw:border-[#e2ebf3] tw:pt-2 tw:text-xs tw:text-[#60778e]">
              <span>Participações: <strong className="tw:text-[#102b50]">{row.participations}</strong></span>
              <span className="tw:break-words">Último torneio: <strong className="tw:text-[#102b50]">{row.lastTournament}</strong></span>
            </div>
          </article>
        ))}
      </div>
      <table className={cx(viewStyles.data_table, "tw:viewport-680:hidden!")}>
        <thead>
          <tr>
            <th>Pos.</th>
            <th>{ranking.type === "PAIR" ? "Dupla" : "Jogador"}</th>
            <th>Pontos</th>
            <th>Participações</th>
            <th>Último torneio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>#{row.position}</td>
              <td><strong>{row.name}</strong></td>
              <td>{row.points}</td>
              <td>{row.participations}</td>
              <td>{row.lastTournament}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default async function RankingDetailPage(props: RankingDetailPageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  const tab = isRankingWorkspaceTab(searchParams?.tab) ? searchParams.tab : "configuracao";
  const requestedPeriod = {
    period: searchParams?.period,
    start: searchParams?.start,
    end: searchParams?.end,
    cycleId: searchParams?.cycleId,
  };
  const ranking = await getRankingProfileLeaderboard(
    auth.arenaId,
    params.rankingId,
    requestedPeriod,
  );
  if (!ranking) notFound();

  const [allCategoryCompetitions, categoryCompetitions] = await Promise.all([
    prisma.categoryCompetition.findMany({
      where: {
        rankingId: ranking.id,
        category: { tournament: { arenaId: auth.arenaId } },
      },
      select: { status: true },
    }),
    prisma.categoryCompetition.findMany({
      where: {
        rankingId: ranking.id,
        category: {
          tournament: {
            arenaId: auth.arenaId,
            createdAt: {
              gte: ranking.period.start,
              ...(ranking.period.endExclusive
                ? { lt: ranking.period.endExclusive }
                : {}),
            },
          },
        },
      },
      select: {
        id: true,
        status: true,
        format: true,
        category: {
          select: {
            name: true,
            tournament: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const formatLocked = allCategoryCompetitions.some(
    (competition) => competition.status !== "DRAFT",
  );
  const periodQuery = ranking.period.query;
  const today = formatRankingDateInput(new Date());

  return (
    <div className={viewStyles.stack_md_ranking_detail_page}>
      <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">{ranking.name}</h1><div className={viewStyles.section_actions}>
          <Link href="/torneios/rankings" className={viewStyles.button}>Voltar aos rankings</Link>
        </div></header>

      <RankingWorkspaceTabs
        rankingId={ranking.id}
        activeTab={tab}
        cycleId={ranking.selectedCycleId}
        periodQuery={periodQuery}
      />

      {tab === "classificacao" || tab === "uso" ? <section className={viewStyles.section_card_ranking_detail_period} aria-label="Período do ranking">
        <div className={viewStyles.stack_xs}>
          <strong>Período</strong>
          {ranking.period.mode === "custom" || ranking.period.mode === "cycle"
            ? <span className={viewStyles.muted}>{ranking.period.label}</span>
            : null}
        </div>
        <nav className={viewStyles.section_actions} aria-label="Atalhos de período">
          {periodPresets.map((preset) => (
            <Link
              key={preset.id}
              href={rankingHref(ranking.id, tab, { period: preset.id })}
              className={cx(`${viewStyles.button}${ranking.period.mode === preset.id ? " " + viewStyles.button_primary : ""}`)}
              aria-current={ranking.period.mode === preset.id ? "page" : undefined}
            >
              {preset.label}
            </Link>
          ))}
          <Link
            href={rankingHref(ranking.id, tab, { period: "custom" })}
            className={cx(`${viewStyles.button}${ranking.period.mode === "custom" ? " " + viewStyles.button_primary : ""}`)}
          >
            Personalizado
          </Link>
          <Link
            href={rankingHref(ranking.id, tab, {
              period: "cycle",
              ...(ranking.cycles[0] ? { cycleId: ranking.cycles[0].id } : {}),
            })}
            className={cx(`${viewStyles.button}${ranking.period.mode === "cycle" ? " " + viewStyles.button_primary : ""}`)}
          >
            Ciclos
          </Link>
        </nav>

        {ranking.period.mode === "custom" ? (
          <form method="get" className={viewStyles.inline_form}>
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="period" value="custom" />
            <div className={viewStyles.field}>
              <label htmlFor="ranking-period-start">Data inicial</label>
              <input id="ranking-period-start" name="start" type="date" defaultValue={periodQuery.start ?? ""} required />
            </div>
            <div className={viewStyles.field}>
              <label htmlFor="ranking-period-end">Data final</label>
              <input id="ranking-period-end" name="end" type="date" defaultValue={periodQuery.end ?? ""} required />
            </div>
            <button type="submit" className={viewStyles.button_button_primary}>Aplicar</button>
          </form>
        ) : null}

        {ranking.period.mode === "cycle" ? (
          <div className="tw:grid tw:gap-3">
            <form method="get" className={viewStyles.inline_form}>
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="period" value="cycle" />
              <div className={viewStyles.field}>
                <label htmlFor="ranking-cycle">Ciclo</label>
                <select id="ranking-cycle" name="cycleId" defaultValue={ranking.selectedCycleId} required>
                  <option value="" disabled>Selecione</option>
                  {ranking.cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.label}{cycle.isCurrent ? " · atual" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={viewStyles.button_button_primary}>Aplicar</button>
            </form>

            <details>
              <summary className={viewStyles.button}>Novo ciclo</summary>
              <SafeActionForm
                action={createRankingCycleAction}
                className="tw:mt-3 tw:grid tw:grid-cols-[repeat(2,minmax(0,1fr))] tw:gap-3 tw:viewport-680:grid-cols-1"
                resetOnSuccess
                successMessage="Ciclo criado com sucesso."
              >
                <input type="hidden" name="rankingId" value={ranking.id} />
                <div className={viewStyles.field}>
                  <label htmlFor="ranking-cycle-label">Nome</label>
                  <input id="ranking-cycle-label" name="label" placeholder="Ex.: 2º semestre 2026" required />
                </div>
                <div className={viewStyles.field}>
                  <label htmlFor="ranking-cycle-start">Data inicial</label>
                  <input id="ranking-cycle-start" name="startedAt" type="date" defaultValue={today} required />
                </div>
                <div className={viewStyles.field}>
                  <label htmlFor="ranking-cycle-end">Data final (opcional)</label>
                  <input id="ranking-cycle-end" name="endedAt" type="date" />
                </div>
                <div className={viewStyles.section_actions_form_full}>
                  <button type="submit" className={viewStyles.button_button_primary}>Criar ciclo</button>
                </div>
              </SafeActionForm>
            </details>
          </div>
        ) : null}

        {ranking.period.error ? <p className={viewStyles.form_error} role="alert">{ranking.period.error}</p> : null}
      </section> : null}

      {tab === "configuracao" ? (
        <RankingConfigurationForm ranking={ranking} formatLocked={formatLocked} />
      ) : null}

      {tab === "pontuacao" ? (
        <div className={viewStyles.stack_md}>
          <SectionCard title="Regras de pontuação" description="Defina os pontos para cada posição compatível com o modelo deste ranking." hideHeading>
            <RankingPointsForm ranking={ranking} />
          </SectionCard>
          <SafeActionForm
            action={resetRankingPointsAction}
            confirmKeyword="RESETAR"
            confirmPrompt="Digite RESETAR para iniciar um novo ciclo sem apagar o histórico."
            className={viewStyles.section_card}
            successMessage="Novo ciclo iniciado com sucesso."
          >
            <input type="hidden" name="rankingId" value={ranking.id} />
            <div>
              <h3 className="tw:sr-only">Iniciar novo ciclo</h3>
              <p className={viewStyles.muted}>O ciclo atual será encerrado e a próxima pontuação começará do zero.</p>
            </div>
            <div className={viewStyles.section_actions}>
              <button type="submit" className={viewStyles.button_button_danger}>Resetar ranking</button>
            </div>
          </SafeActionForm>
        </div>
      ) : null}

      {tab === "classificacao" ? (
        <SectionCard className="tw:p-0!" title="Classificação" description={`Pontuação acumulada em ${ranking.period.label.toLowerCase()}.`} hideHeading>
          <RankingLeaderboard ranking={ranking} />
        </SectionCard>
      ) : null}

      {tab === "uso" ? (
        <div className={viewStyles.stack_md}>
          <SectionCard className="tw:p-0!" title="Categorias vinculadas" description="Categorias que usaram este ranking no período selecionado." hideHeading>
            {categoryCompetitions.length ? (
              <div className={viewStyles.simple_list}>
                <div className="tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-xs tw:text-white">Categorias vinculadas</div>
                {categoryCompetitions.map((competition) => (
                  <div className={viewStyles.simple_item} key={competition.id}>
                    <div>
                      <strong>{competition.category.tournament.name} · {competition.category.name}</strong>
                      <span>{competition.format === "LEAGUE" ? "Liga" : "Mata-mata"} · {formatTournamentStatus(competition.status)}</span>
                    </div>
                    <Link href={`/torneios/${competition.category.tournament.id}`} className={viewStyles.button}>Ver torneio</Link>
                  </div>
                ))}
              </div>
            ) : <p className={viewStyles.muted}>Nenhuma categoria vinculada neste período.</p>}
          </SectionCard>
          <SectionCard className="tw:p-0!" title="Torneios do período" description="Eventos que contribuem para a classificação selecionada." hideHeading>
            {ranking.tournaments.length ? (
              <div className={viewStyles.simple_list}>
                <div className="tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-xs tw:text-white">Torneios do período</div>
                {ranking.tournaments.map((tournament) => (
                  <div className={viewStyles.simple_item} key={tournament.id}>
                    <div>
                      <strong>{tournament.name}</strong>
                      <span>{formatTournamentStatus(tournament.status)}</span>
                    </div>
                    <Link href={`/torneios/${tournament.id}`} className={viewStyles.button}>Ver torneio</Link>
                  </div>
                ))}
              </div>
            ) : <p className={viewStyles.muted}>Nenhum torneio pontuado neste período.</p>}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
