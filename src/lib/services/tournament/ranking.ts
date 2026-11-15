import "server-only";
import { recalculateTournamentRankingPointsTx } from "@/lib/services/tournament-ranking";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";

export async function recalculateTournamentRankingPoints(tournamentId: string, arenaId: string) {
  const tournament = await prisma.tournament.findFirst({ where: { id: tournamentId, arenaId }, select: { id: true } });
  if (!tournament) throw new Error("Torneio não encontrado.");
  await withArenaTransaction(arenaId, async (tx) => {
    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });
}
