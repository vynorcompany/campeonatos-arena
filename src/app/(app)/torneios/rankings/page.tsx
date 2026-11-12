import { viewStyles } from "./page.utilities";
import { RankingList } from "@/components/tournaments/ranking-list";
import { requireModuleView } from "@/lib/auth/guards";
import { getRankingProfilesWithLeaderboard } from "@/lib/services/ranking";

export default async function TournamentRankingsPage() {
  const auth = await requireModuleView("tournaments");
  const rankings = await getRankingProfilesWithLeaderboard(auth.arenaId);

  return (
    <div className={viewStyles.stack_md}>
      <h1 className="tw:sr-only">Rankings</h1>

      <RankingList rankings={rankings} />
    </div>
  );
}
