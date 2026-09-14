import Link from "next/link";
import { RankingList } from "@/components/tournaments/ranking-list";
import { requireModuleView } from "@/lib/auth/guards";
import { getRankingProfilesWithLeaderboard } from "@/lib/services/ranking";

export default async function TournamentRankingsPage() {
  const auth = await requireModuleView("tournaments");
  const rankings = await getRankingProfilesWithLeaderboard(auth.arenaId);

  return (
    <div className="stack-md">
      <header className="page-header">
        <Link href="/torneios/rankings/novo" className="button button-primary">
          Novo ranking
        </Link>
      </header>

      <RankingList rankings={rankings} />
    </div>
  );
}
