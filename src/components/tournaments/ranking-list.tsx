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
      {rankings.map((ranking, index) => (
        <article key={ranking.id} className={viewStyles.active_event_row}>
          <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-4"><span aria-hidden="true" className="tw:grid tw:size-11 tw:shrink-0 tw:place-items-center tw:rounded-xl tw:bg-[#eaf2ff] tw:font-mono tw:text-sm tw:font-semibold tw:text-[#0868e5]">{String(index + 1).padStart(2, "0")}</span><div>
            <strong>{ranking.name}</strong>
            <span>
              {formatType(ranking.type)} · {formatModel(ranking.model)} · {formatGeneralUsage(ranking)}
            </span>
            <small>{ranking._count.tournaments} torneios vinculados</small>
          </div></div>
          <Link href={`/torneios/rankings/${ranking.id}`} className={viewStyles.button}>
            Abrir ranking <span aria-hidden="true">↗</span>
          </Link>
        </article>
      ))}
    </section>
  );
}
