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
        <div className="stack-xs">
          <p className="eyebrow">Campeonatos</p>
          <h1>Rankings</h1>
          <p className="muted">Consulte os rankings da arena e abra o workspace de cada um.</p>
        </div>
        <Link href="/torneios/rankings/novo" className="button button-primary">
          Novo ranking
        </Link>
      </header>

      <RankingList rankings={rankings} />
    </div>
  );
}
