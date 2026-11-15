import "server-only";
import { recalculateTournamentRankingPointsTx } from "@/lib/services/tournament-ranking";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { buildRoundRobin, distributePairsIntoGroups } from "@/lib/services/balancing";
import { buildKnockoutSkeleton, matchStage, resetTournamentStructure, tournamentStatus } from "@/lib/services/tournament/shared";

export async function distributeTournamentGroups(tournamentId: string, arenaId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, arenaId },
    include: {
      pairs: {
        orderBy: {
          totalPoints: "desc"
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  if (!tournament.pairs.length) {
    throw new Error("Monte as duplas antes de organizar os grupos.");
  }

  const groupCount = Math.min(tournament.groupCount, tournament.pairs.length);
  const isRoundRobinOnly = groupCount === 1;
  const minimumPairsPerGroup = Math.ceil(tournament.pairs.length / groupCount);
  const effectivePairsPerGroup = isRoundRobinOnly
    ? tournament.pairs.length
    : Math.max(tournament.pairsPerGroup, minimumPairsPerGroup);

  const groups = distributePairsIntoGroups(tournament.pairs, groupCount, effectivePairsPerGroup);

  await withArenaTransaction(arenaId, async (tx) => {
    await resetTournamentStructure(tx, tournamentId);

    for (const [index, group] of groups.entries()) {
      const createdGroup = await tx.tournamentGroup.create({
        data: {
          tournamentId,
          name: group.name,
          drawOrder: index + 1
        }
      });

      for (const pair of group.pairs) {
        await tx.pair.update({
          where: { id: pair.pairId },
          data: {
            groupId: createdGroup.id
          }
        });
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: tournamentStatus.GROUPS_DEFINED
      }
    });

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return groups.length;
}

export async function generateTournamentMatches(tournamentId: string, arenaId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, arenaId },
    include: {
      groups: {
        include: {
          pairs: true
        },
        orderBy: {
          drawOrder: "asc"
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  if (!tournament.groups.length) {
    throw new Error("Crie os grupos antes de gerar os jogos.");
  }

  await withArenaTransaction(arenaId, async (tx) => {
    await tx.match.deleteMany({
      where: { tournamentId }
    });

    let roundOrder = 1;

    for (const group of tournament.groups) {
      const groupMatches = buildRoundRobin(
        group.id,
        group.pairs.map((pair) => pair.id)
      );

      for (const match of groupMatches) {
        await tx.match.create({
          data: {
            tournamentId,
            groupId: match.groupId,
            stage: matchStage.GROUP,
            label: `${group.name} - ${match.label}`,
            roundOrder,
            homePairId: match.homePairId,
            awayPairId: match.awayPairId
          }
        });
        roundOrder += 1;
      }
    }

    const pairCount = tournament.groups.reduce((total, group) => total + group.pairs.length, 0);

    for (const match of buildKnockoutSkeleton(tournament.groups.length, pairCount)) {
      await tx.match.create({
        data: {
          tournamentId,
          stage: match.stage,
          label: match.label,
          roundOrder
        }
      });
      roundOrder += 1;
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: tournamentStatus.MATCHES_DEFINED
      }
    });

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return true;
}
