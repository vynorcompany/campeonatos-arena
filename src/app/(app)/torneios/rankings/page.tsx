import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { RankingList } from "@/components/tournaments/ranking-list";
import { requireModuleView } from "@/lib/auth/guards";
import { getRankingProfilesWithLeaderboard } from "@/lib/services/ranking";

export default async function TournamentRankingsPage() {
  const auth = await requireModuleView("tournaments");
  const rankings = await getRankingProfilesWithLeaderboard(auth.arenaId);

  return (
    <div className={viewStyles.stack_md}>
      <WorkspaceHeading eyebrow="COMPETIÇÕES · RANKINGS" title="Rankings da arena" description="Organize os rankings da arena e acompanhe a evolução das competições.">
        <Link href="/torneios/rankings/novo" className={viewStyles.button_button_primary}>Novo ranking</Link>
      </WorkspaceHeading>

      <RankingList rankings={rankings} />
    </div>
  );
}
