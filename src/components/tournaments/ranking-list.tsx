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
    <section className="active-event-list ranking-active-list" aria-label="Rankings ativos">
      {rankings.map((ranking) => (
        <article key={ranking.id} className="active-event-row ranking-active-row">
          <div>
            <strong>{ranking.name}</strong>
            <span>
              {formatType(ranking.type)} · {formatModel(ranking.model)} · {formatGeneralUsage(ranking)}
            </span>
            <small>{ranking._count.tournaments} torneios vinculados</small>
          </div>
          <Link href={`/torneios/rankings/${ranking.id}`} className="button">
            Abrir
          </Link>
        </article>
      ))}
    </section>
  );
}
