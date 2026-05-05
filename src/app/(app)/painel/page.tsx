import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { requireModuleView } from "@/lib/auth/guards";
import { getArenaDashboard } from "@/lib/services/tournament";

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  READY_FOR_DRAW: "Pronto para sorteio",
  GROUPS_DEFINED: "Grupos definidos",
  MATCHES_DEFINED: "Jogos definidos",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado"
};

export default async function OverviewPage() {
  const auth = await requireModuleView("dashboard");
  const { players, activeTournament, tournamentHistory } = await getArenaDashboard(auth.arenaId);
  const groupedMatches = activeTournament?.matches.filter((match) => match.stage === "GROUP") ?? [];
  const knockoutMatches = activeTournament?.matches.filter((match) => match.stage !== "GROUP") ?? [];
  const completedMatches = activeTournament?.matches.filter((match) => match.winnerPairId !== null).length ?? 0;
  const isRoundRobinOnly = activeTournament?.groupCount === 1;
  const activePlayers = players.filter((player) => player.active).length;
  const totalHistoryMatches = tournamentHistory.reduce((total, tournament) => total + tournament._count.matches, 0);
  const totalHistoryEntries = tournamentHistory.reduce((total, tournament) => total + tournament._count.entries, 0);
  const averageHistoryMatches = tournamentHistory.length
    ? (totalHistoryMatches / tournamentHistory.length).toFixed(1).replace(".", ",")
    : "0";

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Visão geral</p>
          <h1>Painel principal</h1>
          <p className="muted">
            Acompanhe o andamento do campeonato, o desempenho da arena e o histórico dos torneios em um só lugar.
          </p>
        </div>
        <span className="pill">{activeTournament ? statusLabels[activeTournament.status] : "Nenhum torneio em andamento"}</span>
      </header>

      <div className="stats-grid">
        <StatCard label="Jogadores ativos" value={activePlayers} caption="Disponíveis para os próximos torneios" />
        <StatCard label="Duplas formadas" value={activeTournament?.pairs.length ?? 0} caption="No torneio atual" />
        <StatCard label="Grupos montados" value={activeTournament?.groups.length ?? 0} caption="Distribuição atual" />
        <StatCard label="Jogos finalizados" value={completedMatches} caption="Resultados já registrados" />
      </div>

      <div className="dashboard-grid">
        <SectionCard
          title="Torneio atual"
          description={
            activeTournament
              ? isRoundRobinOnly
                ? `O torneio ${activeTournament.name} está em andamento no formato todos contra todos.`
                : `O torneio ${activeTournament.name} está em andamento com ${activeTournament.groupCount} grupos previstos e ${activeTournament.pairsPerGroup} duplas como base por grupo.`
              : "Quando um novo torneio for criado, as informações principais aparecerão aqui."
          }
        >
          {activeTournament ? (
            <div className="simple-list">
              <div className="simple-item">
                <strong>Nome</strong>
                <span>{activeTournament.name}</span>
              </div>
              <div className="simple-item">
                <strong>Status</strong>
                <span>{statusLabels[activeTournament.status]}</span>
              </div>
              <div className="simple-item">
                <strong>Jogadores</strong>
                <span>{activeTournament.entries.length}</span>
              </div>
              <div className="simple-item">
                <strong>Duplas</strong>
                <span>{activeTournament.pairs.length}</span>
              </div>
              <div className="simple-item">
                <strong>Jogos concluídos</strong>
                <span>
                  {completedMatches}/{activeTournament.matches.length}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted">Ainda não há um torneio em andamento.</p>
          )}
        </SectionCard>

        <SectionCard title="Andamento da competição" description="Resumo rápido da fase atual.">
          <div className="simple-list">
            <div className="simple-item">
              <strong>Fase de grupos</strong>
              <span>{groupedMatches.length} jogos</span>
            </div>
            <div className="simple-item">
              <strong>{isRoundRobinOnly ? "Formato" : "Mata-mata"}</strong>
              <span>{isRoundRobinOnly ? "Todos contra todos" : `${knockoutMatches.length} jogos`}</span>
            </div>
            <div className="simple-item">
              <strong>Duplas sem grupo</strong>
              <span>{activeTournament?.pairs.filter((pair) => !pair.groupId).length ?? 0}</span>
            </div>
            <div className="simple-item">
              <strong>Partidas encerradas</strong>
              <span>{completedMatches}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Jogadores" description="Panorama atual do cadastro da arena.">
          <div className="simple-list">
            <div className="simple-item">
              <strong>Total cadastrado</strong>
              <span>{players.length}</span>
            </div>
            <div className="simple-item">
              <strong>Ativos</strong>
              <span>{activePlayers}</span>
            </div>
            <div className="simple-item">
              <strong>Inativos</strong>
              <span>{players.length - activePlayers}</span>
            </div>
            <div className="simple-item">
              <strong>Participações no histórico</strong>
              <span>{totalHistoryEntries}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Histórico" description="Resumo dos torneios já concluídos.">
          <div className="simple-list">
            <div className="simple-item">
              <strong>Torneios finalizados</strong>
              <span>{tournamentHistory.length}</span>
            </div>
            <div className="simple-item">
              <strong>Jogos registrados</strong>
              <span>{totalHistoryMatches}</span>
            </div>
            <div className="simple-item">
              <strong>Média por torneio</strong>
              <span>{averageHistoryMatches} jogos</span>
            </div>
            <div className="simple-item">
              <strong>Último torneio</strong>
              <span>{tournamentHistory[0]?.name ?? "Nenhum torneio finalizado ainda"}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Torneios encerrados"
        description="Consulte os campeonatos já finalizados e revise os detalhes de cada um."
      >
        {tournamentHistory.length ? (
          <div className="simple-list">
            {tournamentHistory.map((tournament) => (
              <div key={tournament.id} className="simple-item">
                <div className="match-copy">
                  <strong>{tournament.name}</strong>
                  <span>
                    Finalizado em {tournament.updatedAt.toLocaleDateString("pt-BR")} • {tournament._count.entries} jogadores •{" "}
                    {tournament._count.matches} jogos
                  </span>
                </div>
                <div className="section-actions">
                  <span className="pill">Encerrado</span>
                  <Link href={`/torneios/${tournament.id}`} className="button">
                    Ver detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum torneio finalizado até o momento.</p>
        )}
      </SectionCard>
    </div>
  );
}
