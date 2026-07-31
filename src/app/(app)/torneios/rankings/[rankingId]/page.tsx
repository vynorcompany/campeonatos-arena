import Link from "next/link";
import { notFound } from "next/navigation";
import { RankingConfigurationForm } from "@/components/forms/ranking-configuration-form";
import { RankingPointsForm } from "@/components/forms/ranking-points-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { RankingWorkspaceTabs, isRankingWorkspaceTab } from "@/components/tournaments/ranking-workspace-tabs";
import { SectionCard } from "@/components/section-card";
import { resetRankingPointsAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";

type RankingDetailPageProps = {
  params: { rankingId: string };
  searchParams?: { tab?: string; cycleId?: string };
};

function formatTournamentStatus(status: string) {
  return ({ DRAFT: "Rascunho", READY_FOR_DRAW: "Pronto para sorteio", GROUPS_DEFINED: "Grupos definidos", MATCHES_DEFINED: "Jogos definidos", FINISHED: "Finalizado" } as Record<string, string>)[status] ?? status;
}

function RankingLeaderboard({ ranking }: { ranking: NonNullable<Awaited<ReturnType<typeof getRankingProfileLeaderboard>>> }) {
  const rows = ranking.type === "PAIR" ? ranking.pairLeaderboard : ranking.leaderboard;
  if (!rows.length) return <p className="muted">Ainda não há participantes pontuados neste período.</p>;

  return (
    <table className="data-table">
      <thead><tr><th>Pos.</th><th>{ranking.type === "PAIR" ? "Dupla" : "Jogador"}</th><th>Pontos</th><th>Participações</th><th>Último torneio</th></tr></thead>
      <tbody>
        {ranking.type === "PAIR"
          ? ranking.pairLeaderboard.map((pair, index) => <tr key={pair.pairKey}><td>#{index + 1}</td><td><strong>{pair.pairName}</strong></td><td>{pair.points}</td><td>{pair.competitionsPlayed}</td><td>{pair.lastTournamentName ?? "-"}</td></tr>)
          : ranking.leaderboard.map((player, index) => <tr key={player.playerId}><td>#{index + 1}</td><td><strong>{player.playerName}</strong></td><td>{player.points}</td><td>{player.tournamentsPlayed}</td><td>{player.lastTournamentName ?? "-"}</td></tr>)}
      </tbody>
    </table>
  );
}

export default async function RankingDetailPage({ params, searchParams }: RankingDetailPageProps) {
  const auth = await requireModuleView("tournaments");
  const tab = isRankingWorkspaceTab(searchParams?.tab) ? searchParams.tab : "configuracao";
  const cycleId = typeof searchParams?.cycleId === "string" ? searchParams.cycleId : undefined;
  const ranking = await getRankingProfileLeaderboard(auth.arenaId, params.rankingId, cycleId);
  if (!ranking) notFound();

  const categoryCompetitions = await prisma.categoryCompetition.findMany({
    where: { rankingId: ranking.id, category: { tournament: { arenaId: auth.arenaId } } },
    select: { id: true, status: true, format: true, category: { select: { name: true, tournament: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  const formatLocked = categoryCompetitions.some((competition) => competition.status !== "DRAFT");

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Rankings</p>
          <h1>{ranking.name}</h1>
          <p className="muted">{ranking.type === "PAIR" ? "Duplas" : "Individual"} · {ranking.model === "LEAGUE" ? "Liga" : "Mata-mata"}</p>
        </div>
        <div className="section-actions"><Link href="/torneios/rankings" className="button">Voltar aos rankings</Link></div>
      </header>

      <RankingWorkspaceTabs
        rankingId={ranking.id}
        activeTab={tab}
        cycleId={ranking.selectedCycleId}
      />

      <form method="get" className="inline-form" aria-label="Período do ranking">
        <input type="hidden" name="tab" value={tab} />
        <div className="field">
          <label htmlFor="ranking-cycle">Período</label>
          <select
            id="ranking-cycle"
            name="cycleId"
            defaultValue={ranking.selectedCycleId}
          >
            {ranking.cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.label}{cycle.isCurrent ? " · atual" : ""}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="button">Exibir período</button>
      </form>

      {tab === "configuracao" ? <RankingConfigurationForm ranking={ranking} formatLocked={formatLocked} /> : null}

      {tab === "pontuacao" ? (
        <div className="stack-md">
          <SectionCard title="Regras de pontuação" description="Defina os pontos para cada posição compatível com o modelo deste ranking.">
            <RankingPointsForm ranking={ranking} />
          </SectionCard>
          <SafeActionForm action={resetRankingPointsAction} confirmKeyword="RESETAR" confirmPrompt="Digite RESETAR para iniciar um novo ciclo sem apagar o histórico." className="section-card stack-sm" successMessage="Novo ciclo iniciado com sucesso.">
            <input type="hidden" name="rankingId" value={ranking.id} />
            <div><h3>Iniciar novo ciclo</h3><p className="muted">O ciclo atual será encerrado e a próxima pontuação começará do zero.</p></div>
            <div className="section-actions"><button type="submit" className="button button-danger">Resetar ranking</button></div>
          </SafeActionForm>
        </div>
      ) : null}

      {tab === "classificacao" ? <SectionCard title="Classificação" description="Pontuação acumulada no ciclo selecionado."><RankingLeaderboard ranking={ranking} /></SectionCard> : null}

      {tab === "uso" ? (
        <div className="stack-md">
          <SectionCard title="Categorias vinculadas" description="Categorias que usam este ranking para aplicar pontuação.">
            {categoryCompetitions.length ? <div className="simple-list">{categoryCompetitions.map((competition) => <div className="simple-item" key={competition.id}><div><strong>{competition.category.tournament.name} · {competition.category.name}</strong><span>{competition.format === "LEAGUE" ? "Liga" : "Mata-mata"} · {competition.status}</span></div><Link href={`/torneios/${competition.category.tournament.id}`} className="button">Ver torneio</Link></div>)}</div> : <p className="muted">Nenhuma categoria vinculada a este ranking.</p>}
          </SectionCard>
          <SectionCard title="Torneios do ciclo" description="Eventos que contribuem para a classificação selecionada.">
            {ranking.tournaments.length ? <div className="simple-list">{ranking.tournaments.map((tournament) => <div className="simple-item" key={tournament.id}><div><strong>{tournament.name}</strong><span>{formatTournamentStatus(tournament.status)}</span></div><Link href={`/torneios/${tournament.id}`} className="button">Ver torneio</Link></div>)}</div> : <p className="muted">Nenhum torneio pontuado neste ciclo.</p>}
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
