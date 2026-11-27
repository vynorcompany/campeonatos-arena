import { ManualUpcomingMatchesTv } from "@/components/manual-upcoming-matches-tv";
import { requireModuleView } from "@/lib/auth/guards";
import { getTvWorkspace } from "@/lib/tv/query";

export default async function UpcomingMatchesTvPage() {
  const auth = await requireModuleView("tv");
  const {payload,arenaLogoUrl}=await getTvWorkspace(auth.arenaId,"presentation");

  return (
    <ManualUpcomingMatchesTv
      arenaName={auth.arenaName ?? "Arena Padel"}
      arenaLogoUrl={arenaLogoUrl}
      matches={payload.matches}
      settings={payload.settings}
      sponsors={payload.sponsors}
      ranking={payload.ranking}
      rankingSlides={payload.rankingSlides}
      calendar={payload.calendar}
    />
  );
}
