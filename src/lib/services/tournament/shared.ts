import "server-only";
import type { Prisma } from "@prisma/client";
import type { MatchStage, TournamentStatus } from "@/types/tournament";

export const tournamentStatus = {
  DRAFT: "DRAFT",
  READY_FOR_DRAW: "READY_FOR_DRAW",
  GROUPS_DEFINED: "GROUPS_DEFINED",
  MATCHES_DEFINED: "MATCHES_DEFINED",
  FINISHED: "FINISHED"
} satisfies Record<string, TournamentStatus>;

export const matchStage = {
  GROUP: "GROUP",
  OCTOFINAL: "OCTOFINAL",
  QUARTERFINAL: "QUARTERFINAL",
  SEMIFINAL: "SEMIFINAL",
  FINAL: "FINAL"
} satisfies Record<string, MatchStage>;

export type RankedPair = {
  pairId: string;
  groupId: string;
  groupName: string;
  groupDrawOrder: number;
  groupRank: number;
  overallRank: number;
};

export type GroupStandingEntry = {
  pairId: string;
  pairName: string;
  groupId: string;
  groupName: string;
  groupDrawOrder: number;
  groupPairCount: number;
  groupRank: number;
  wins: number;
  scoreDiff: number;
  pointsFor: number;
  totalPoints: number;
};

export async function lockIndividualRanking(
  tx: Prisma.TransactionClient,
  arenaId: string,
  rankingId: string | null,
) {
  if (!rankingId) {
    return;
  }

  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtext(${rankingId}))
  `;
  const ranking = await tx.rankingProfile.findFirst({
    where: {
      id: rankingId,
      arenaId,
      type: "INDIVIDUAL",
      model: "KNOCKOUT",
    },
    select: { id: true },
  });
  if (!ranking) {
    throw new Error("Ranking individual inválido para esta arena.");
  }
}

export function getGroupLabelByOrder(drawOrder: number) {
  return `Grupo ${String.fromCharCode(64 + drawOrder)}`;
}

export function shouldUsePairedGroupSeeding(groupCount: number, knockoutSize: number) {
  return groupCount > 1 && groupCount % 2 === 0 && knockoutSize === groupCount * 2;
}

export function buildPairedGroupMatchLabels(groupCount: number, stagePrefix: "OF" | "QF" | "SF") {
  const labels: string[] = [];
  let matchNumber = 1;

  for (let groupIndex = 1; groupIndex <= groupCount; groupIndex += 2) {
    const firstGroup = getGroupLabelByOrder(groupIndex);
    const secondGroup = getGroupLabelByOrder(groupIndex + 1);

    labels.push(`${stagePrefix} ${matchNumber} - 1Âº ${firstGroup} x 2Âº ${secondGroup}`);
    matchNumber += 1;
    labels.push(`${stagePrefix} ${matchNumber} - 1Âº ${secondGroup} x 2Âº ${firstGroup}`);
    matchNumber += 1;
  }

  return labels;
}

export function buildPairedGroupSeeds(standings: RankedPair[]) {
  const groupedStandings = new Map<number, RankedPair[]>();

  for (const standing of standings) {
    const currentGroup = groupedStandings.get(standing.groupDrawOrder) ?? [];
    currentGroup.push(standing);
    groupedStandings.set(standing.groupDrawOrder, currentGroup);
  }

  const orderedGroups = [...groupedStandings.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, groupStandings]) => groupStandings.sort((a, b) => a.groupRank - b.groupRank));

  const seeds: Array<[RankedPair | null, RankedPair | null]> = [];

  for (let index = 0; index < orderedGroups.length; index += 2) {
    const firstGroup = orderedGroups[index] ?? [];
    const secondGroup = orderedGroups[index + 1] ?? [];

    seeds.push([
      firstGroup.find((entry) => entry.groupRank === 1) ?? null,
      secondGroup.find((entry) => entry.groupRank === 2) ?? null
    ]);
    seeds.push([
      secondGroup.find((entry) => entry.groupRank === 1) ?? null,
      firstGroup.find((entry) => entry.groupRank === 2) ?? null
    ]);
  }

  return seeds;
}

export function getNextKnockoutTarget(label: string) {
  const parsedLabel = label.trim().toUpperCase().match(/^(OF|QF|SF)\s*(\d+)/);

  if (!parsedLabel) {
    return null;
  }

  const [, stagePrefix, rawIndex] = parsedLabel;
  const index = Number(rawIndex);

  if (stagePrefix === "OF" && index >= 1 && index <= 8) {
    const quarterIndex = Math.ceil(index / 2);
    return {
      nextLabel: `QF ${quarterIndex} - Vencedor OF${quarterIndex * 2 - 1} x Vencedor OF${quarterIndex * 2}`,
      slot: index % 2 === 1 ? ("homePairId" as const) : ("awayPairId" as const)
    };
  }

  if (stagePrefix === "QF" && index >= 1 && index <= 4) {
    const semifinalIndex = Math.ceil(index / 2);
    return {
      nextLabel: `SF ${semifinalIndex} - Vencedor QF${semifinalIndex * 2 - 1} x Vencedor QF${semifinalIndex * 2}`,
      slot: index % 2 === 1 ? ("homePairId" as const) : ("awayPairId" as const)
    };
  }

  if (stagePrefix === "SF" && (index === 1 || index === 2)) {
    return {
      nextLabel: "Final",
      slot: index === 1 ? ("homePairId" as const) : ("awayPairId" as const)
    };
  }

  return null;
}

export async function clearFollowingMatches(tx: Prisma.TransactionClient, tournamentId: string, label: string) {
  const target = getNextKnockoutTarget(label);

  if (!target) {
    return;
  }

  const nextMatch = await tx.match.findFirst({
    where: {
      tournamentId,
      label: target.nextLabel
    }
  });

  if (!nextMatch) {
    return;
  }

  await tx.match.update({
    where: { id: nextMatch.id },
    data: {
      [target.slot]: null,
      homeScore: null,
      awayScore: null,
      winnerPairId: null
    }
  });

  await clearFollowingMatches(tx, tournamentId, nextMatch.label);
}

export async function clearKnockoutMatches(tx: Prisma.TransactionClient, tournamentId: string) {
  await tx.match.updateMany({
    where: {
      tournamentId,
      stage: {
        not: matchStage.GROUP
      }
    },
    data: {
      homePairId: null,
      awayPairId: null,
      homeScore: null,
      awayScore: null,
      winnerPairId: null
    }
  });
}

export async function buildGroupStandings(tx: Prisma.TransactionClient, tournamentId: string): Promise<GroupStandingEntry[]> {
  const groups = await tx.tournamentGroup.findMany({
    where: { tournamentId },
    include: {
      pairs: true,
      matches: true
    },
    orderBy: {
      drawOrder: "asc"
    }
  });

  const standings = groups.flatMap((group) => {
    const groupStats = new Map(
      group.pairs.map((pair) => [
        pair.id,
        {
          pairId: pair.id,
          pairName: pair.name,
          totalPoints: pair.totalPoints,
          groupDrawOrder: group.drawOrder,
          wins: 0,
          scoreDiff: 0,
          pointsFor: 0
        }
      ])
    );

    for (const match of group.matches) {
      if (
        !match.homePairId ||
        !match.awayPairId ||
        match.homeScore === null ||
        match.awayScore === null ||
        !match.winnerPairId
      ) {
        continue;
      }

      const homeStats = groupStats.get(match.homePairId);
      const awayStats = groupStats.get(match.awayPairId);

      if (homeStats) {
        homeStats.pointsFor += match.homeScore;
        homeStats.scoreDiff += match.homeScore - match.awayScore;
        homeStats.wins += match.winnerPairId === match.homePairId ? 1 : 0;
      }

      if (awayStats) {
        awayStats.pointsFor += match.awayScore;
        awayStats.scoreDiff += match.awayScore - match.homeScore;
        awayStats.wins += match.winnerPairId === match.awayPairId ? 1 : 0;
      }
    }

    return [...groupStats.values()]
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
        if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.pairName.localeCompare(b.pairName);
      })
      .map((pair, index) => ({
        pairId: pair.pairId,
        pairName: pair.pairName,
        groupId: group.id,
        groupName: group.name,
        groupDrawOrder: pair.groupDrawOrder,
        groupPairCount: group.pairs.length,
        groupRank: index + 1,
        wins: pair.wins,
        scoreDiff: pair.scoreDiff,
        pointsFor: pair.pointsFor,
        totalPoints: pair.totalPoints
      }));
  });

  return standings;
}

export async function assignWinnerToNextMatch(
  tx: Prisma.TransactionClient,
  tournamentId: string,
  label: string,
  winnerPairId: string
) {
  const target = getNextKnockoutTarget(label);

  if (!target) {
    return;
  }

  const nextMatch = await tx.match.findFirst({
    where: {
      tournamentId,
      label: target.nextLabel
    }
  });

  if (!nextMatch) {
    return;
  }

  const slotChanged =
    (target.slot === "homePairId" && nextMatch.homePairId !== winnerPairId) ||
    (target.slot === "awayPairId" && nextMatch.awayPairId !== winnerPairId);

  await tx.match.update({
    where: { id: nextMatch.id },
    data: {
      [target.slot]: winnerPairId,
      ...(slotChanged
        ? {
            homeScore: null,
            awayScore: null,
            winnerPairId: null
          }
        : {})
    }
  });
}

export function buildGroupQualificationMap(standings: GroupStandingEntry[], knockoutSize: number) {
  const groups = new Map<
    string,
    {
      groupId: string;
      groupName: string;
      drawOrder: number;
      pairCount: number;
      quota: number;
    }
  >();

  for (const standing of standings) {
    if (groups.has(standing.groupId)) {
      continue;
    }

    groups.set(standing.groupId, {
      groupId: standing.groupId,
      groupName: standing.groupName,
      drawOrder: standing.groupDrawOrder,
      pairCount: standing.groupPairCount,
      quota: 0
    });
  }

  const orderedGroups = [...groups.values()].sort((a, b) => {
    if (b.pairCount !== a.pairCount) return b.pairCount - a.pairCount;
    return a.drawOrder - b.drawOrder;
  });

  if (!orderedGroups.length || knockoutSize <= 0) {
    return groups;
  }

  const baseQuota = Math.floor(knockoutSize / orderedGroups.length);

  for (const group of orderedGroups) {
    group.quota = Math.min(group.pairCount, baseQuota);
  }

  let remainingSlots = knockoutSize - orderedGroups.reduce((total, group) => total + group.quota, 0);

  while (remainingSlots > 0) {
    let assignedInPass = false;

    for (const group of orderedGroups) {
      if (group.quota >= group.pairCount) {
        continue;
      }

      group.quota += 1;
      remainingSlots -= 1;
      assignedInPass = true;

      if (remainingSlots === 0) {
        break;
      }
    }

    if (!assignedInPass) {
      break;
    }
  }

  return groups;
}

export async function buildQualifiedStandings(tx: Prisma.TransactionClient, tournamentId: string): Promise<RankedPair[]> {
  const standings = await buildGroupStandings(tx, tournamentId);
  const uniqueGroupCount = new Set(standings.map((entry) => entry.groupId)).size;
  const knockoutSize = getKnockoutSize(uniqueGroupCount, standings.length);

  if (knockoutSize === 0) {
    return [];
  }

  const qualificationMap = buildGroupQualificationMap(standings, knockoutSize);
  const qualifiedPairs = standings.filter((standing) => {
    const qualification = qualificationMap.get(standing.groupId);

    if (!qualification) {
      return false;
    }

    return standing.groupRank <= qualification.quota;
  });

  return qualifiedPairs
    .sort((a, b) => {
      if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.groupDrawOrder - b.groupDrawOrder;
    })
    .map((pair, index) => ({
      pairId: pair.pairId,
      groupId: pair.groupId,
      groupName: pair.groupName,
      groupDrawOrder: pair.groupDrawOrder,
      groupRank: pair.groupRank,
      overallRank: index + 1
    }));
}

export async function seedKnockoutFromGroupStandings(tx: Prisma.TransactionClient, tournamentId: string) {
  const pendingGroupMatches = await tx.match.count({
    where: {
      tournamentId,
      stage: matchStage.GROUP,
      winnerPairId: null
    }
  });

  if (pendingGroupMatches > 0) {
    return;
  }

  const existingKnockoutMatches = await tx.match.count({
    where: {
      tournamentId,
      stage: {
        not: matchStage.GROUP
      }
    }
  });

  if (existingKnockoutMatches === 0) {
    const groups = await tx.tournamentGroup.findMany({
      where: { tournamentId },
      include: {
        pairs: true
      },
      orderBy: {
        drawOrder: "asc"
      }
    });

    const pairCount = groups.reduce((total, group) => total + group.pairs.length, 0);
    const maxRoundOrder = await tx.match.aggregate({
      where: { tournamentId },
      _max: {
        roundOrder: true
      }
    });

    let nextRoundOrder = maxRoundOrder._max.roundOrder ?? 0;

    for (const match of buildKnockoutSkeleton(groups.length, pairCount)) {
      nextRoundOrder += 1;
      await tx.match.create({
        data: {
          tournamentId,
          stage: match.stage,
          label: match.label,
          roundOrder: nextRoundOrder
        }
      });
    }
  }

  const standings = await buildQualifiedStandings(tx, tournamentId);
  const groupCount = new Set(standings.map((entry) => entry.groupId)).size;

  await clearKnockoutMatches(tx, tournamentId);

  const octofinals = await tx.match.findMany({
    where: {
      tournamentId,
      stage: matchStage.OCTOFINAL
    },
    orderBy: {
      roundOrder: "asc"
    }
  });

  if (octofinals.length) {
    const seeds = shouldUsePairedGroupSeeding(groupCount, 16)
      ? buildPairedGroupSeeds(standings)
      : [
          [standings[0] ?? null, standings[15] ?? null],
          [standings[7] ?? null, standings[8] ?? null],
          [standings[4] ?? null, standings[11] ?? null],
          [standings[3] ?? null, standings[12] ?? null],
          [standings[2] ?? null, standings[13] ?? null],
          [standings[5] ?? null, standings[10] ?? null],
          [standings[6] ?? null, standings[9] ?? null],
          [standings[1] ?? null, standings[14] ?? null]
        ];

    for (const [index, match] of octofinals.entries()) {
      const homePairId = seeds[index]?.[0]?.pairId ?? null;
      const awayPairId = seeds[index]?.[1]?.pairId ?? null;

      await tx.match.update({
        where: { id: match.id },
        data: {
          homePairId,
          awayPairId
        }
      });
    }

    return;
  }

  const quarterfinals = await tx.match.findMany({
    where: {
      tournamentId,
      stage: matchStage.QUARTERFINAL
    },
    orderBy: {
      roundOrder: "asc"
    }
  });

  if (quarterfinals.length) {
    const seeds = shouldUsePairedGroupSeeding(groupCount, 8)
      ? buildPairedGroupSeeds(standings)
      : [
          [standings[0] ?? null, standings[7] ?? null],
          [standings[3] ?? null, standings[4] ?? null],
          [standings[2] ?? null, standings[5] ?? null],
          [standings[1] ?? null, standings[6] ?? null]
        ];

    for (const [index, match] of quarterfinals.entries()) {
      const homePairId = seeds[index]?.[0]?.pairId ?? null;
      const awayPairId = seeds[index]?.[1]?.pairId ?? null;

      await tx.match.update({
        where: { id: match.id },
        data: {
          homePairId,
          awayPairId
        }
      });
    }

    return;
  }

  const semifinals = await tx.match.findMany({
    where: {
      tournamentId,
      stage: matchStage.SEMIFINAL
    },
    orderBy: {
      roundOrder: "asc"
    }
  });

  if (semifinals.length) {
    const seeds = shouldUsePairedGroupSeeding(groupCount, 4)
      ? buildPairedGroupSeeds(standings)
      : [
          [standings[0] ?? null, standings[3] ?? null],
          [standings[1] ?? null, standings[2] ?? null]
        ];

    for (const [index, match] of semifinals.entries()) {
      const homePairId = seeds[index]?.[0]?.pairId ?? null;
      const awayPairId = seeds[index]?.[1]?.pairId ?? null;

      await tx.match.update({
        where: { id: match.id },
        data: {
          homePairId,
          awayPairId
        }
      });
    }

    return;
  }

  const final = await tx.match.findFirst({
    where: {
      tournamentId,
      stage: matchStage.FINAL
    },
    orderBy: {
      roundOrder: "asc"
    }
  });

  if (final) {
    const homePairId = standings[0]?.pairId ?? null;
    const awayPairId = standings[1]?.pairId ?? null;

    await tx.match.update({
      where: { id: final.id },
      data: {
        homePairId,
        awayPairId
      }
    });
  }
}

export async function resetTournamentStructure(tx: Prisma.TransactionClient, tournamentId: string) {
  await tx.match.deleteMany({
    where: { tournamentId }
  });

  await tx.tournamentGroup.deleteMany({
    where: { tournamentId }
  });
}

export async function resetTournamentDraw(tx: Prisma.TransactionClient, tournamentId: string) {
  await resetTournamentStructure(tx, tournamentId);

  await tx.pairPlayer.deleteMany({
    where: {
      pair: {
        tournamentId
      }
    }
  });

  await tx.pair.deleteMany({
    where: { tournamentId }
  });
}

export async function resequenceTournamentPairs(tx: Prisma.TransactionClient, tournamentId: string) {
  const pairs = await tx.pair.findMany({
    where: { tournamentId },
    orderBy: [
      { totalPoints: "desc" },
      { createdAt: "asc" }
    ]
  });

  for (const [index, pair] of pairs.entries()) {
    await tx.pair.update({
      where: { id: pair.id },
      data: {
        drawOrder: index + 1
      }
    });
  }
}

export function getKnockoutSize(groupCount: number, pairCount: number) {
  if (groupCount < 1 || pairCount < 2) {
    return 0;
  }

  if (pairCount < 4) {
    return 2;
  }

  if (pairCount >= 16) {
    return 16;
  }

  if (pairCount >= 8) {
    return 8;
  }

  return 4;
}

export function buildKnockoutSkeleton(groupCount: number, pairCount: number) {
  const knockoutSize = getKnockoutSize(groupCount, pairCount);
  const usePairedGroupSeeding = shouldUsePairedGroupSeeding(groupCount, knockoutSize);

  if (knockoutSize === 0) {
    return [];
  }

  if (knockoutSize === 16) {
    const octofinalLabels = usePairedGroupSeeding
      ? buildPairedGroupMatchLabels(groupCount, "OF")
      : [
          "OF 1 - 1Âº geral x 16Âº geral",
          "OF 2 - 8Âº geral x 9Âº geral",
          "OF 3 - 5Âº geral x 12Âº geral",
          "OF 4 - 4Âº geral x 13Âº geral",
          "OF 5 - 3Âº geral x 14Âº geral",
          "OF 6 - 6Âº geral x 11Âº geral",
          "OF 7 - 7Âº geral x 10Âº geral",
          "OF 8 - 2Âº geral x 15Âº geral"
        ];

    return [
      ...octofinalLabels.map((label, index) => ({
        stage: matchStage.OCTOFINAL,
        label,
        roundOrder: index + 1
      })),
      { stage: matchStage.QUARTERFINAL, label: "QF 1 - Vencedor OF1 x Vencedor OF2", roundOrder: 9 },
      { stage: matchStage.QUARTERFINAL, label: "QF 2 - Vencedor OF3 x Vencedor OF4", roundOrder: 10 },
      { stage: matchStage.QUARTERFINAL, label: "QF 3 - Vencedor OF5 x Vencedor OF6", roundOrder: 11 },
      { stage: matchStage.QUARTERFINAL, label: "QF 4 - Vencedor OF7 x Vencedor OF8", roundOrder: 12 },
      { stage: matchStage.SEMIFINAL, label: "SF 1 - Vencedor QF1 x Vencedor QF2", roundOrder: 13 },
      { stage: matchStage.SEMIFINAL, label: "SF 2 - Vencedor QF3 x Vencedor QF4", roundOrder: 14 },
      { stage: matchStage.FINAL, label: "Final", roundOrder: 15 }
    ];
  }

  if (knockoutSize === 8) {
    const quarterfinalLabels = usePairedGroupSeeding
      ? buildPairedGroupMatchLabels(groupCount, "QF")
      : [
          "QF 1 - 1Âº geral x 8Âº geral",
          "QF 2 - 4Âº geral x 5Âº geral",
          "QF 3 - 3Âº geral x 6Âº geral",
          "QF 4 - 2Âº geral x 7Âº geral"
        ];

    return [
      ...quarterfinalLabels.map((label, index) => ({
        stage: matchStage.QUARTERFINAL,
        label,
        roundOrder: index + 1
      })),
      { stage: matchStage.SEMIFINAL, label: "SF 1 - Vencedor QF1 x Vencedor QF2", roundOrder: 5 },
      { stage: matchStage.SEMIFINAL, label: "SF 2 - Vencedor QF3 x Vencedor QF4", roundOrder: 6 },
      { stage: matchStage.FINAL, label: "Final", roundOrder: 7 }
    ];
  }

  if (knockoutSize === 4) {
    const semifinalLabels = usePairedGroupSeeding
      ? buildPairedGroupMatchLabels(groupCount, "SF")
      : [
          "SF 1 - 1Âº geral x 4Âº geral",
          "SF 2 - 2Âº geral x 3Âº geral"
        ];

    return [
      ...semifinalLabels.map((label, index) => ({
        stage: matchStage.SEMIFINAL,
        label,
        roundOrder: index + 1
      })),
      { stage: matchStage.FINAL, label: "Final", roundOrder: 3 }
    ];
  }

  return [{ stage: matchStage.FINAL, label: "Final", roundOrder: 1 }];
}
