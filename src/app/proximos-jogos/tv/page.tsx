import { ManualUpcomingMatchesTv } from "@/components/manual-upcoming-matches-tv";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getTvPresentationPayload } from "@/lib/services/tv-presentation";

export default async function UpcomingMatchesTvPage() {
  const auth = await requireModuleView("tv");
  const [arena, payload] = await Promise.all([
    prisma.arena.findUnique({
      where: {
        id: auth.arenaId
      },
      select: {
        logoUrl: true
      }
    }),
    getTvPresentationPayload(auth.arenaId)
  ]);

  return (
    <ManualUpcomingMatchesTv
      arenaName={auth.arenaName ?? "Arena Padel"}
      arenaLogoUrl={arena?.logoUrl ?? "/arena-profile.jpg"}
      matches={payload.matches}
      settings={payload.settings}
      sponsors={payload.sponsors}
      ranking={payload.ranking}
      rankingSlides={payload.rankingSlides}
      calendar={payload.calendar}
    />
  );
}
