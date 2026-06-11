import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { requireModuleView } from "@/lib/auth/guards";
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";

type RankingDetailPageProps = {
  params: {
    rankingId: string;
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

export default async function RankingDetailPage({ params }: RankingDetailPageProps) {
  const auth = await requireModuleView("tournaments");
  const ranking = await getRankingProfileLeaderboard(auth.arenaId, params.rankingId);

  if (!ranking) {
    notFound();
  }

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>{ranking.name}</h1>
          <p className="muted">
            Esta tela mostra a classificacao acumulada dos jogadores nos torneios que usam este ranking.
          </p>
        </div>
        <div className="section-actions">
          <Link href="/torneios/rankings" className="button">Voltar aos rankings</Link>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Jogadores vinculados" value={ranking.linkedPlayers} caption="Somados a partir dos torneios desse ranking" />
        <StatCard label="Torneios vinculados" value={ranking._count.tournaments} caption="Qualquer status, incluindo em andamento" />
        <StatCard label="Entradas pontuadas" value={ranking.linkedTournamentEntries} caption="Entradas de torneios que alimentam a classificacao" />
        <StatCard label="Regras" value={ranking.rules.length} caption="Pontuacao usada para este ranking" />
      </div>

      <SectionCard
        title="Como o ranking e calculado"
        description="Nao existe um ranking direto no jogador. A classificacao e montada pelos torneios que selecionam este ranking e somam os pontos de cada inscricao."
      >
          <div className="simple-list">
            <div className="simple-item">
              <strong>Vinculo</strong>
              <span>Torneio {"->"} ranking selecionado {"->"} entradas do torneio</span>
            </div>
          <div className="simple-item">
            <strong>Pontos</strong>
            <span>Somatorio de tournamentPoints de todas as entradas ligadas a este ranking</span>
          </div>
          <div className="simple-item">
            <strong>Desempate</strong>
            <span>Mais torneios, depois ordem alfabetica do jogador</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ranking dos jogadores" description="Lista completa dos jogadores vinculados a este ranking.">
        {ranking.leaderboard.length ? (
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
            Ainda nao ha jogadores neste ranking. Isso significa que nenhum torneio com este ranking foi pontuado ate agora.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Torneios vinculados" description="Torneios que usam este ranking como base de pontuacao.">
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
          <p className="muted">Nenhum torneio vinculado a este ranking ainda.</p>
        )}
      </SectionCard>
    </div>
  );
}
