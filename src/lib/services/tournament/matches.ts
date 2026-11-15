import "server-only";
import { recalculateTournamentRankingPointsTx } from "@/lib/services/tournament-ranking";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { assignWinnerToNextMatch, clearFollowingMatches, matchStage, seedKnockoutFromGroupStandings, tournamentStatus } from "@/lib/services/tournament/shared";

export async function repairTournamentKnockout(
  tournamentId: string,
  arenaId: string,
  options?: {
    finishTournamentIfChampionDefined?: boolean;
  }
) {
  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId
    },
    select: {
      id: true
    }
  });

  if (!tournament) {
    throw new Error("Torneio não encontrado.");
  }

  await withArenaTransaction(arenaId, async (tx) => {
    await seedKnockoutFromGroupStandings(tx, tournamentId);

    if (options?.finishTournamentIfChampionDefined) {
      const final = await tx.match.findFirst({
        where: {
          tournamentId,
          stage: matchStage.FINAL
        },
        select: {
          winnerPairId: true
        }
      });

      if (final?.winnerPairId) {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: tournamentStatus.FINISHED
          }
        });
      }
    }

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return true;
}

export async function updateMatchResult(matchId: string, arenaId: string, homeScore: number, awayScore: number) {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      tournament: {
        arenaId
      }
    }
  });

  if (!match) {
    throw new Error("Jogo nÃ£o encontrado.");
  }

  if (!match.homePairId || !match.awayPairId) {
    throw new Error("Defina as duas duplas antes de salvar o resultado.");
  }

  const winnerPairId = homeScore > awayScore ? match.homePairId : match.awayPairId;

  await withArenaTransaction(arenaId, async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        winnerPairId
      }
    });

    if (match.stage === matchStage.GROUP) {
      await seedKnockoutFromGroupStandings(tx, match.tournamentId);
    } else {
      if (match.winnerPairId && match.winnerPairId !== winnerPairId) {
        await clearFollowingMatches(tx, match.tournamentId, match.label);
      }

      await assignWinnerToNextMatch(tx, match.tournamentId, match.label, winnerPairId);
    }

    await recalculateTournamentRankingPointsTx(tx, match.tournamentId);
  });

  return true;
}

export async function updateKnockoutParticipants(
  matchId: string,
  arenaId: string,
  homePairId: string | null,
  awayPairId: string | null
) {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      tournament: {
        arenaId
      }
    }
  });

  if (!match) {
    throw new Error("Jogo nÃ£o encontrado.");
  }

  if (match.stage === matchStage.GROUP) {
    throw new Error("A definiÃ§Ã£o manual de confronto sÃ³ vale para o mata-mata.");
  }

  const participantsChanged = match.homePairId !== homePairId || match.awayPairId !== awayPairId;

  await withArenaTransaction(arenaId, async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        homePairId,
        awayPairId,
        homeScore: null,
        awayScore: null,
        winnerPairId: null
      }
    });

    if (participantsChanged) {
      await clearFollowingMatches(tx, match.tournamentId, match.label);
    }

    await recalculateTournamentRankingPointsTx(tx, match.tournamentId);
  });

  return true;
}
