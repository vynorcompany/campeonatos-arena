import Link from "next/link";
import type { RankingProfileWithLeaderboard } from "@/lib/services/ranking";

type RankingListProps = {
  rankings: RankingProfileWithLeaderboard[];
};

function formatType(type: RankingProfileWithLeaderboard["type"]) {
  return type === "PAIR" ? "Duplas" : "Individual";
}

function formatModel(model: RankingProfileWithLeaderboard["model"]) {
  return model === "LEAGUE" ? "Liga" : "Mata-mata";
}

function formatGeneralUsage(ranking: RankingProfileWithLeaderboard) {
  if (ranking.isGeneral) return "Ranking Geral";
  if (ranking.feedsGeneralRanking) return "Alimenta o Ranking Geral";
  return "Ranking específico";
}

export function RankingList({ rankings }: RankingListProps) {
  if (!rankings.length) {
    return <p className="muted">Nenhum ranking cadastrado ainda.</p>;
  }

  return (
    <div className="simple-list">
      {rankings.map((ranking) => (
        <div key={ranking.id} className="simple-item">
          <div className="match-copy">
            <strong>{ranking.name}</strong>
            <span>
              {formatType(ranking.type)} · {formatModel(ranking.model)} · {formatGeneralUsage(ranking)}
            </span>
            <small>{ranking._count.tournaments} torneios vinculados</small>
          </div>
          <Link href={`/torneios/rankings/${ranking.id}`} className="button">
            Abrir
          </Link>
        </div>
      ))}
    </div>
  );
}
