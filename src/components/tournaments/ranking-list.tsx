import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { viewStyles } from "./ranking-list.utilities";
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
    return <p className={viewStyles.muted}>Nenhum ranking cadastrado ainda.</p>;
  }

  return (
    <section className={viewStyles.active_event_list} aria-label="Rankings ativos">
      <div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_auto]`}><span>Ranking</span><span>Ações</span></div>
      {rankings.map((ranking) => (
        <article key={ranking.id} className={viewStyles.active_event_row}>
          <div>
            <strong>{ranking.name}</strong>
            <span>
              {formatType(ranking.type)} · {formatModel(ranking.model)} · {formatGeneralUsage(ranking)}
            </span>
            <small>{ranking._count.tournaments} torneios vinculados</small>
          </div>
          <Link href={`/torneios/rankings/${ranking.id}`} className={viewStyles.button}>
            Abrir
          </Link>
        </article>
      ))}
    </section>
  );
}
