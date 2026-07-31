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
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";

type RankingDetailPageProps = {
  params: { rankingId: string };
  searchParams?: {
    tab?: string;
    period?: string;
    start?: string;
    end?: string;
    cycleId?: string;
  };
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
  const rows = ranking.type === "PAIR" ? ranking.pairLeaderboard : ranking.leaderboard;
  if (!rows.length) {
    return <p className="muted">Ainda não há participantes pontuados neste período.</p>;
  }

  return (
    <table className="data-table">
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
        {ranking.type === "PAIR"
          ? ranking.pairLeaderboard.map((pair, index) => (
              <tr key={pair.pairKey}>
                <td>#{index + 1}</td>
                <td><strong>{pair.pairName}</strong></td>
                <td>{pair.points}</td>
                <td>{pair.competitionsPlayed}</td>
                <td>{pair.lastTournamentName ?? "-"}</td>
              </tr>
            ))
          : ranking.leaderboard.map((player, index) => (
              <tr key={player.playerId}>
                <td>#{index + 1}</td>
                <td><strong>{player.playerName}</strong></td>
                <td>{player.points}</td>
                <td>{player.tournamentsPlayed}</td>
                <td>{player.lastTournamentName ?? "-"}</td>
              </tr>
            ))}
      </tbody>
    </table>
  );
}

export default async function RankingDetailPage({ params, searchParams }: RankingDetailPageProps) {
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
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Rankings</p>
          <h1>{ranking.name}</h1>
          <p className="muted">
            {ranking.type === "PAIR" ? "Duplas" : "Individual"} · {ranking.model === "LEAGUE" ? "Liga" : "Mata-mata"}
          </p>
        </div>
        <div className="section-actions">
          <Link href="/torneios/rankings" className="button">Voltar aos rankings</Link>
        </div>
      </header>

      <RankingWorkspaceTabs
        rankingId={ranking.id}
        activeTab={tab}
        cycleId={ranking.selectedCycleId}
        periodQuery={periodQuery}
      />

      <section className="section-card stack-sm" aria-label="Período do ranking">
        <div className="stack-xs">
          <strong>Período</strong>
          <span className="muted">{ranking.period.label}</span>
        </div>
        <nav className="section-actions" aria-label="Atalhos de período">
          {periodPresets.map((preset) => (
            <Link
              key={preset.id}
              href={rankingHref(ranking.id, tab, { period: preset.id })}
              className={`button${ranking.period.mode === preset.id ? " button-primary" : ""}`}
              aria-current={ranking.period.mode === preset.id ? "page" : undefined}
            >
              {preset.label}
            </Link>
          ))}
          <Link
            href={rankingHref(ranking.id, tab, { period: "custom" })}
            className={`button${ranking.period.mode === "custom" ? " button-primary" : ""}`}
          >
            Personalizado
          </Link>
          <Link
            href={rankingHref(ranking.id, tab, {
              period: "cycle",
              ...(ranking.cycles[0] ? { cycleId: ranking.cycles[0].id } : {}),
            })}
            className={`button${ranking.period.mode === "cycle" ? " button-primary" : ""}`}
          >
            Ciclos
          </Link>
        </nav>

        {ranking.period.mode === "custom" ? (
          <form method="get" className="inline-form">
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="period" value="custom" />
            <div className="field">
              <label htmlFor="ranking-period-start">Data inicial</label>
              <input id="ranking-period-start" name="start" type="date" defaultValue={periodQuery.start ?? ""} required />
            </div>
            <div className="field">
              <label htmlFor="ranking-period-end">Data final</label>
              <input id="ranking-period-end" name="end" type="date" defaultValue={periodQuery.end ?? ""} required />
            </div>
            <button type="submit" className="button button-primary">Aplicar</button>
          </form>
        ) : null}

        {ranking.period.mode === "cycle" ? (
          <div className="stack-sm">
            <form method="get" className="inline-form">
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="period" value="cycle" />
              <div className="field">
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
              <button type="submit" className="button button-primary">Aplicar</button>
            </form>

            <details>
              <summary className="button">Novo ciclo</summary>
              <SafeActionForm
                action={createRankingCycleAction}
                className="form-grid compact-form"
                resetOnSuccess
                successMessage="Ciclo criado com sucesso."
              >
                <input type="hidden" name="rankingId" value={ranking.id} />
                <div className="field">
                  <label htmlFor="ranking-cycle-label">Nome</label>
                  <input id="ranking-cycle-label" name="label" placeholder="Ex.: 2º semestre 2026" required />
                </div>
                <div className="field">
                  <label htmlFor="ranking-cycle-start">Data inicial</label>
                  <input id="ranking-cycle-start" name="startedAt" type="date" defaultValue={today} required />
                </div>
                <div className="field">
                  <label htmlFor="ranking-cycle-end">Data final (opcional)</label>
                  <input id="ranking-cycle-end" name="endedAt" type="date" />
                </div>
                <div className="section-actions form-full">
                  <button type="submit" className="button button-primary">Criar ciclo</button>
                </div>
              </SafeActionForm>
            </details>
          </div>
        ) : null}

        {ranking.period.error ? <p className="form-error" role="alert">{ranking.period.error}</p> : null}
      </section>

      {tab === "configuracao" ? (
        <RankingConfigurationForm ranking={ranking} formatLocked={formatLocked} />
      ) : null}

      {tab === "pontuacao" ? (
        <div className="stack-md">
          <SectionCard title="Regras de pontuação" description="Defina os pontos para cada posição compatível com o modelo deste ranking.">
            <RankingPointsForm ranking={ranking} />
          </SectionCard>
          <SafeActionForm
            action={resetRankingPointsAction}
            confirmKeyword="RESETAR"
            confirmPrompt="Digite RESETAR para iniciar um novo ciclo sem apagar o histórico."
            className="section-card stack-sm"
            successMessage="Novo ciclo iniciado com sucesso."
          >
            <input type="hidden" name="rankingId" value={ranking.id} />
            <div>
              <h3>Iniciar novo ciclo</h3>
              <p className="muted">O ciclo atual será encerrado e a próxima pontuação começará do zero.</p>
            </div>
            <div className="section-actions">
              <button type="submit" className="button button-danger">Resetar ranking</button>
            </div>
          </SafeActionForm>
        </div>
      ) : null}

      {tab === "classificacao" ? (
        <SectionCard title="Classificação" description={`Pontuação acumulada em ${ranking.period.label.toLowerCase()}.`}>
          <RankingLeaderboard ranking={ranking} />
        </SectionCard>
      ) : null}

      {tab === "uso" ? (
        <div className="stack-md">
          <SectionCard title="Categorias vinculadas" description="Categorias que usaram este ranking no período selecionado.">
            {categoryCompetitions.length ? (
              <div className="simple-list">
                {categoryCompetitions.map((competition) => (
                  <div className="simple-item" key={competition.id}>
                    <div>
                      <strong>{competition.category.tournament.name} · {competition.category.name}</strong>
                      <span>{competition.format === "LEAGUE" ? "Liga" : "Mata-mata"} · {competition.status}</span>
                    </div>
                    <Link href={`/torneios/${competition.category.tournament.id}`} className="button">Ver torneio</Link>
                  </div>
                ))}
              </div>
            ) : <p className="muted">Nenhuma categoria vinculada neste período.</p>}
          </SectionCard>
          <SectionCard title="Torneios do período" description="Eventos que contribuem para a classificação selecionada.">
            {ranking.tournaments.length ? (
              <div className="simple-list">
                {ranking.tournaments.map((tournament) => (
                  <div className="simple-item" key={tournament.id}>
                    <div>
                      <strong>{tournament.name}</strong>
                      <span>{formatTournamentStatus(tournament.status)}</span>
                    </div>
                    <Link href={`/torneios/${tournament.id}`} className="button">Ver torneio</Link>
                  </div>
                ))}
              </div>
            ) : <p className="muted">Nenhum torneio pontuado neste período.</p>}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
