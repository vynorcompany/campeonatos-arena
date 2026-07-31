import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { requireModuleView } from "@/lib/auth/guards";
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";
import { resetRankingPointsAction } from "@/lib/actions/tournament";

type RankingDetailPageProps = {
  params: {
    rankingId: string;
  };
  searchParams?: {
    cycleId?: string;
  };
};

function formatTournamentLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "READY_FOR_DRAW":
      return "Pronto para sorteio";
    case "GROUPS_DEFINED":
      return "Grupos definidos";
    case "MATCHES_DEFINED":
      return "Jogos definidos";
    case "FINISHED":
      return "Finalizado";
    default:
      return status;
  }
}

function formatCyclePeriod(startedAt: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(startedAt);
}

export default async function RankingDetailPage({ params, searchParams }: RankingDetailPageProps) {
  const auth = await requireModuleView("tournaments");
  const selectedCycleId = typeof searchParams?.cycleId === "string" ? searchParams.cycleId : undefined;
  const ranking = await getRankingProfileLeaderboard(auth.arenaId, params.rankingId, selectedCycleId);

  if (!ranking) {
    notFound();
  }

  const selectedCycle =
    ranking.cycles.find((cycle) => cycle.id === ranking.selectedCycleId) ?? ranking.cycles[0];

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>{ranking.name}</h1>
          <p className="muted">
            Esta tela mostra a classificacao acumulada {ranking.type === "PAIR" ? "das duplas" : "dos jogadores"} nos torneios que usam este ranking.
          </p>
        </div>
        <div className="section-actions">
          <Link href="/torneios/rankings" className="button">Voltar aos rankings</Link>
        </div>
      </header>

      <SectionCard
        title="Período do ranking"
        description="Escolha um ciclo para ver a pontuação acumulada daquele período ou reinicie o placar para começar um novo ciclo."
      >
        <div className="stack-md">
          <form className="inline-form" method="get">
            <div className="field">
              <label htmlFor="cycleId">Filtrar período</label>
              <select id="cycleId" name="cycleId" defaultValue={ranking.selectedCycleId}>
                {ranking.cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.label} · {formatCyclePeriod(cycle.startedAt)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="button button-primary">
              Aplicar filtro
            </button>
          </form>

          <SafeActionForm
            action={resetRankingPointsAction}
            confirmKeyword="RESETAR"
            confirmPrompt="Digite RESETAR para zerar a pontuação deste ranking e iniciar um novo ciclo."
            successMessage="Novo ciclo iniciado com sucesso."
            className="inline-form"
          >
            <input type="hidden" name="rankingId" value={ranking.id} />
            <div className="field">
              <label>Resetar pontuação</label>
              <p className="muted">
                O ciclo atual será encerrado e os próximos torneios começam do zero.
              </p>
            </div>
            <button type="submit" className="button button-danger">
              Resetar ranking
            </button>
          </SafeActionForm>
        </div>
      </SectionCard>

      <div className="stats-grid">
        <StatCard label={ranking.type === "PAIR" ? "Jogadores nas duplas" : "Jogadores vinculados"} value={ranking.linkedPlayers} caption="Somados a partir dos torneios desse ranking" />
        <StatCard label="Torneios do período" value={ranking.tournaments.length} caption="Torneios que entram no ciclo selecionado" />
        <StatCard label="Entradas pontuadas" value={ranking.linkedTournamentEntries} caption="Entradas do período selecionado" />
        <StatCard label="Regras" value={ranking.rules.length} caption="Pontuacao usada para este ranking" />
      </div>

      <SectionCard
        title="Como o ranking e calculado"
        description={ranking.type === "PAIR"
          ? "A classificacao soma, para cada dupla, os pontos aplicados pelas competicoes de categoria no ciclo selecionado."
          : "Nao existe um ranking direto no jogador. A classificacao e montada pelos torneios que selecionam este ranking e somam os pontos de cada inscricao no ciclo ativo."}
      >
          <div className="simple-list">
            <div className="simple-item">
              <strong>Vinculo</strong>
              <span>
                {ranking.type === "PAIR"
                  ? <>Categoria {"->"} ranking selecionado {"->"} duplas da competição</>
                  : <>Torneio {"->"} ranking selecionado {"->"} entradas do torneio</>}
              </span>
            </div>
          <div className="simple-item">
            <strong>Pontos</strong>
            <span>
              {ranking.type === "PAIR"
                ? "Soma dos pontos por colocação aplicados às duplas no período selecionado"
                : "Somatorio de tournamentPoints das entradas do período selecionado"}
            </span>
          </div>
          <div className="simple-item">
            <strong>Reset</strong>
            <span>O ciclo encerrado continua guardado e o próximo ciclo começa zerado</span>
          </div>
          <div className="simple-item">
            <strong>Desempate</strong>
            <span>
              {ranking.type === "PAIR"
                ? "Mais competições, depois ordem alfabética da dupla"
                : "Mais torneios, depois ordem alfabetica do jogador"}
            </span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={ranking.type === "PAIR" ? "Ranking das duplas" : "Ranking dos jogadores"}
        description={ranking.type === "PAIR"
          ? "Lista completa das duplas pontuadas neste ranking."
          : "Lista completa dos jogadores vinculados a este ranking."}
      >
        {ranking.type === "PAIR" && ranking.pairLeaderboard.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Dupla</th>
                <th>Pontos</th>
                <th>Competições</th>
                <th>Último torneio</th>
              </tr>
            </thead>
            <tbody>
              {ranking.pairLeaderboard.map((pair, index) => (
                <tr key={pair.pairKey}>
                  <td>#{index + 1}</td>
                  <td><strong>{pair.pairName}</strong></td>
                  <td>{pair.points}</td>
                  <td>{pair.competitionsPlayed}</td>
                  <td>{pair.lastTournamentName ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : ranking.type === "INDIVIDUAL" && ranking.leaderboard.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Jogador</th>
                <th>Pontos</th>
                <th>Torneios</th>
                <th>Ultimo torneio</th>
              </tr>
            </thead>
            <tbody>
              {ranking.leaderboard.map((player, index) => (
                <tr key={player.playerId}>
                  <td>#{index + 1}</td>
                  <td>
                    <div className="stack-xs">
                      <strong>{player.playerName}</strong>
                      <span className="muted">{player.playerActive ? "Ativo" : "Inativo"}</span>
                    </div>
                  </td>
                  <td>{player.points}</td>
                  <td>{player.tournamentsPlayed}</td>
                  <td>
                    <div className="stack-xs">
                      <strong>{player.lastTournamentName ?? "-"}</strong>
                      <span className="muted">{player.lastTournamentStatus ? formatTournamentLabel(player.lastTournamentStatus) : "-"}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">
            Ainda nao ha {ranking.type === "PAIR" ? "duplas" : "jogadores"} neste período. Isso significa que nenhum torneio com este ranking foi pontuado neste ciclo.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Torneios do período selecionado" description="Torneios que entram na pontuação deste ciclo.">
        {ranking.tournaments.length ? (
          <div className="simple-list">
            {ranking.tournaments.map((tournament) => (
              <div key={tournament.id} className="simple-item">
                <div className="match-copy">
                  <strong>{tournament.name}</strong>
                  <span>{formatTournamentLabel(tournament.status)} · {tournament.createdAt.toLocaleDateString("pt-BR")}</span>
                </div>
                <Link href={`/torneios/${tournament.id}`} className="button">
                  Ver torneio
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum torneio neste período ainda.</p>
        )}
      </SectionCard>

      <SectionCard title="Histórico de ciclos" description="Veja os períodos anteriores já encerrados neste ranking.">
        {ranking.cycles.length ? (
          <div className="simple-list">
            {ranking.cycles.map((cycle) => (
              <div key={cycle.id} className="simple-item">
                <div className="match-copy">
                  <strong>
                    {cycle.label}
                    {cycle.id === ranking.selectedCycleId ? " · selecionado" : ""}
                  </strong>
                  <span>
                    {formatCyclePeriod(cycle.startedAt)} · {cycle.tournamentCount} torneios · {cycle.entryCount} entradas
                  </span>
                </div>
                <Link href={`/torneios/rankings/${ranking.id}?cycleId=${cycle.id}`} className="button">
                  Ver período
                </Link>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
