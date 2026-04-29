import { ManualUpcomingMatchesTv } from "@/components/manual-upcoming-matches-tv";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function UpcomingMatchesTvPage() {
  const auth = await requireArenaAccess();
  const manualMatches = await prisma.manualUpcomingMatch.findMany({
    where: {
      arenaId: auth.arenaId
    },
    orderBy: [
      {
        displayOrder: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });

  return (
    <ManualUpcomingMatchesTv
      arenaName={auth.arenaName ?? "Arena Padel"}
      matches={manualMatches.map((match) => ({
        id: match.id,
        displayOrder: match.displayOrder,
        homePairName: match.homePairName,
        awayPairName: match.awayPairName,
        courtName: match.courtName,
        scheduledTime: match.scheduledTime
      }))}
    />
  );
}
