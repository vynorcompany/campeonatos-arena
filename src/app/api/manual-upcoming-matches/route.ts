import { NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

  return NextResponse.json({
    matches: manualMatches.map((match) => ({
      id: match.id,
      displayOrder: match.displayOrder,
      homePairName: match.homePairName,
      awayPairName: match.awayPairName,
      courtName: match.courtName,
      scheduledTime: match.scheduledTime
    }))
  });
}
