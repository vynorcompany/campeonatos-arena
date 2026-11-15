import "server-only";
import { Prisma, type CompetitionFormat } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setArenaRlsContext } from "@/lib/rls";
import { buildKnockout } from "@/lib/tournament-category/draw";
import { type PlacementRuleMap, type PlacementStage } from "@/lib/tournament-category/ranking";
import { getRankingRuleBlueprint, type RankingModel } from "@/lib/validators/ranking";
import { selectQuarterfinalists } from "@/lib/tournament-category/standings";
import type { GroupStandings, StandingMatch } from "@/lib/tournament-category/types";
import { assertMatchCanBeCorrected } from "@/lib/tournament-category/match-status";

export const categoryCompetitionStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  FINISHED: "FINISHED",
} as const;

export const categoryMatchStage = {
  GROUP: "GROUP",
  QUARTERFINAL: "QUARTERFINAL",
  SEMIFINAL: "SEMIFINAL",
  FINAL: "FINAL",
} as const;

export async function runSerializableTransaction<T>(
  arenaId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await setArenaRlsContext(tx, arenaId);
        return operation(tx);
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < maximumAttempts;
      if (!canRetry) {
        throw error;
      }
    }
  }

  throw new Error("Não foi possível serializar a operação da competição.");
}

export type CreateCategoryCompetitionInput = {
  categoryId: string;
  class: string;
  gender: string;
  format: CompetitionFormat;
  leagueTier?: "A" | "B";
  rankingId: string | null;
  isPublic: boolean;
};

export type PairResultMatch = {
  stage: string;
  homePairId: string | null;
  awayPairId: string | null;
  winnerPairId: string | null;
};

export function buildRuleMap(
  rules: Array<{ stageKey: string; points: number }>,
  model: RankingModel,
): PlacementRuleMap {
  const values = new Map(rules.map((rule) => [rule.stageKey, rule.points]));
  const stageKeys = getRankingRuleBlueprint(model).map(
    (rule) => rule.stageKey as PlacementStage,
  );

  for (const stageKey of stageKeys) {
    if (!values.has(stageKey)) {
      throw new Error(`O ranking não possui pontuação para ${stageKey}.`);
    }
  }

  return Object.fromEntries(
    stageKeys.map((stageKey) => [stageKey, values.get(stageKey) ?? 0]),
  ) as PlacementRuleMap;
}

export function getWinnerPairId(
  homePairId: string,
  awayPairId: string,
  homeScore: number,
  awayScore: number,
) {
  return homeScore > awayScore ? homePairId : awayPairId;
}

export async function assertStoredMatchCanBeCorrected(
  tx: Prisma.TransactionClient,
  match: {
    competitionId: string;
    stage: string;
    roundOrder: number;
    winnerPairId: string | null;
  },
) {
  if (!match.winnerPairId || match.stage === categoryMatchStage.GROUP) {
    return;
  }

  const downstreamMatch = await tx.categoryMatch.findFirst({
    where: {
      competitionId: match.competitionId,
      roundOrder: { gt: match.roundOrder },
      OR: [
        { homePairId: match.winnerPairId },
        { awayPairId: match.winnerPairId },
      ],
    },
    select: { id: true },
  });

  assertMatchCanBeCorrected({
    stage: match.stage,
    winnerPairId: match.winnerPairId,
    hasDownstreamParticipant: Boolean(downstreamMatch),
  });
}

export function getKnockoutLabel(stage: string, stageIndex: number) {
  if (stage === categoryMatchStage.QUARTERFINAL) {
    return `Quartas de final ${stageIndex + 1}`;
  }
  if (stage === categoryMatchStage.SEMIFINAL) {
    return `Semifinal ${stageIndex + 1}`;
  }
  return "Final";
}

export function buildStandingsRows(
  pairIds: string[],
  matches: StandingMatch[],
) {
  return pairIds.map((pairId) => {
    let victories = 0;
    let differential = 0;

    for (const match of matches) {
      if (match.homePairId !== pairId && match.awayPairId !== pairId) {
        continue;
      }

      if (match.winnerPairId === pairId) {
        victories += 1;
      }

      if (match.homeScore == null || match.awayScore == null) {
        continue;
      }

      differential +=
        match.homePairId === pairId
          ? match.homeScore - match.awayScore
          : match.awayScore - match.homeScore;
    }

    return { pairId, victories, differential };
  });
}

export async function getGroupStandings(
  tx: Prisma.TransactionClient,
  competitionId: string,
): Promise<GroupStandings[]> {
  const groups = await tx.categoryGroup.findMany({
    where: { competitionId },
    orderBy: { drawOrder: "asc" },
    include: {
      pairs: {
        orderBy: { drawOrder: "asc" },
        select: { id: true },
      },
      matches: {
        where: { stage: categoryMatchStage.GROUP },
        orderBy: { roundOrder: "asc" },
        select: {
          homePairId: true,
          awayPairId: true,
          homeScore: true,
          awayScore: true,
          winnerPairId: true,
        },
      },
    },
  });

  return groups.map((group) => {
    const matches = group.matches
      .filter(
        (
          match,
        ): match is typeof match & {
          homePairId: string;
          awayPairId: string;
        } => Boolean(match.homePairId && match.awayPairId),
      )
      .map((match) => ({
        homePairId: match.homePairId,
        awayPairId: match.awayPairId,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        winnerPairId: match.winnerPairId,
      }));

    return {
      rows: buildStandingsRows(
        group.pairs.map((pair) => pair.id),
        matches,
      ),
      matches,
    };
  });
}

export async function invalidateKnockoutBracket(
  tx: Prisma.TransactionClient,
  competitionId: string,
) {
  await tx.categoryMatch.updateMany({
    where: {
      competitionId,
      stage: { not: categoryMatchStage.GROUP },
    },
    data: {
      homePairId: null,
      awayPairId: null,
      homeScore: null,
      awayScore: null,
      winnerPairId: null,
      manualStatus: "WAITING",
    },
  });
}

export async function resetKnockoutFromStandings(
  tx: Prisma.TransactionClient,
  competitionId: string,
  format: CompetitionFormat,
) {
  if (format === "LEAGUE") {
    return;
  }

  const standings = await getGroupStandings(tx, competitionId);
  const qualifiedPairIds = selectQuarterfinalists(standings);
  const knockout = buildKnockout(format, qualifiedPairIds);
  const quarterfinals = await tx.categoryMatch.findMany({
    where: {
      competitionId,
      stage: categoryMatchStage.QUARTERFINAL,
    },
    orderBy: { roundOrder: "asc" },
    select: { id: true },
  });

  const quarterfinalBlueprint = knockout.filter(
    (match) => match.stage === categoryMatchStage.QUARTERFINAL,
  );
  if (quarterfinals.length !== quarterfinalBlueprint.length) {
    throw new Error("A chave de quartas de final está incompleta.");
  }

  await invalidateKnockoutBracket(tx, competitionId);

  for (const [index, match] of quarterfinals.entries()) {
    const blueprint = quarterfinalBlueprint[index];
    await tx.categoryMatch.update({
      where: { id: match.id },
      data: {
        homePairId: blueprint.homePairId,
        awayPairId: blueprint.awayPairId,
        homeScore: null,
        awayScore: null,
        winnerPairId: null,
        manualStatus: "WAITING",
      },
    });
  }
}

export async function clearTargetDescendant(
  tx: Prisma.TransactionClient,
  competitionId: string,
  stage: string,
  stageIndex: number,
) {
  if (stage !== categoryMatchStage.SEMIFINAL) {
    return;
  }

  const final = await tx.categoryMatch.findFirst({
    where: {
      competitionId,
      stage: categoryMatchStage.FINAL,
    },
    select: {
      id: true,
      homePairId: true,
      awayPairId: true,
    },
  });
  if (!final) {
    return;
  }

  await tx.categoryMatch.update({
    where: { id: final.id },
    data: {
      ...(stageIndex === 0 ? { homePairId: null } : { awayPairId: null }),
      homeScore: null,
      awayScore: null,
      winnerPairId: null,
    },
  });
}

export async function advanceKnockoutWinner(
  tx: Prisma.TransactionClient,
  match: PairResultMatch & { id: string; competitionId: string },
  winnerPairId: string,
) {
  if (match.stage === categoryMatchStage.FINAL) {
    return;
  }

  const sourceMatches = await tx.categoryMatch.findMany({
    where: {
      competitionId: match.competitionId,
      stage: match.stage,
    },
    orderBy: { roundOrder: "asc" },
    select: { id: true },
  });
  const sourceIndex = sourceMatches.findIndex((item) => item.id === match.id);
  if (sourceIndex < 0) {
    throw new Error("Jogo eliminatório inválido.");
  }

  const targetStage =
    match.stage === categoryMatchStage.QUARTERFINAL
      ? categoryMatchStage.SEMIFINAL
      : categoryMatchStage.FINAL;
  const targetIndex =
    match.stage === categoryMatchStage.QUARTERFINAL
      ? Math.floor(sourceIndex / 2)
      : 0;
  const targetMatches = await tx.categoryMatch.findMany({
    where: {
      competitionId: match.competitionId,
      stage: targetStage,
    },
    orderBy: { roundOrder: "asc" },
    select: {
      id: true,
      homePairId: true,
      awayPairId: true,
      winnerPairId: true,
    },
  });
  const target = targetMatches[targetIndex];
  if (!target) {
    throw new Error("Próximo jogo da chave não encontrado.");
  }

  const slot = sourceIndex % 2 === 0 ? "homePairId" : "awayPairId";
  const participantChanged = target[slot] !== winnerPairId;
  if (participantChanged && target.winnerPairId) {
    await clearTargetDescendant(
      tx,
      match.competitionId,
      targetStage,
      targetIndex,
    );
  }

  await tx.categoryMatch.update({
    where: { id: target.id },
    data: {
      [slot]: winnerPairId,
      ...(participantChanged
        ? {
            homeScore: null,
            awayScore: null,
            winnerPairId: null,
          }
        : {}),
    },
  });
}
