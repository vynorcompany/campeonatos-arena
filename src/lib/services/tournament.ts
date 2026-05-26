import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRoundRobin, distributePairsIntoGroups, generateBalancedPairs } from "@/lib/services/balancing";
import type { MatchStage, TournamentStatus } from "@/types/tournament";

const tournamentStatus = {
  DRAFT: "DRAFT",
  READY_FOR_DRAW: "READY_FOR_DRAW",
  GROUPS_DEFINED: "GROUPS_DEFINED",
  MATCHES_DEFINED: "MATCHES_DEFINED",
  FINISHED: "FINISHED"
} satisfies Record<string, TournamentStatus>;

const matchStage = {
  GROUP: "GROUP",
  OCTOFINAL: "OCTOFINAL",
  QUARTERFINAL: "QUARTERFINAL",
  SEMIFINAL: "SEMIFINAL",
  FINAL: "FINAL"
} satisfies Record<string, MatchStage>;

type RankedPair = {
  pairId: string;
  groupId: string;
  groupName: string;
  groupDrawOrder: number;
  groupRank: number;
  overallRank: number;
};

type GroupStandingEntry = {
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

function getGroupLabelByOrder(drawOrder: number) {
  return `Grupo ${String.fromCharCode(64 + drawOrder)}`;
}

function shouldUsePairedGroupSeeding(groupCount: number, knockoutSize: number) {
  return groupCount > 1 && groupCount % 2 === 0 && knockoutSize === groupCount * 2;
}

function buildPairedGroupMatchLabels(groupCount: number, stagePrefix: "OF" | "QF" | "SF") {
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

function buildPairedGroupSeeds(standings: RankedPair[]) {
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

function getNextKnockoutTarget(label: string) {
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

const rankingStageKey = {
  CHAMPION: "CHAMPION",
  RUNNER_UP: "RUNNER_UP",
  SEMIFINAL: "SEMIFINAL",
  QUARTERFINAL: "QUARTERFINAL",
  PARTICIPATION: "PARTICIPATION"
} as const;

function getMatchLoserPairId(match: {
  homePairId: string | null;
  awayPairId: string | null;
  winnerPairId: string | null;
}) {
  if (!match.homePairId || !match.awayPairId || !match.winnerPairId) {
    return null;
  }

  if (match.winnerPairId === match.homePairId) {
    return match.awayPairId;
  }

  if (match.winnerPairId === match.awayPairId) {
    return match.homePairId;
  }

  return null;
}

function buildRankingRuleMap(
  rules: Array<{
    stageKey: string;
    points: number;
  }>
) {
  return {
    [rankingStageKey.CHAMPION]: rules.find((rule) => rule.stageKey === rankingStageKey.CHAMPION)?.points ?? 0,
    [rankingStageKey.RUNNER_UP]: rules.find((rule) => rule.stageKey === rankingStageKey.RUNNER_UP)?.points ?? 0,
    [rankingStageKey.SEMIFINAL]: rules.find((rule) => rule.stageKey === rankingStageKey.SEMIFINAL)?.points ?? 0,
    [rankingStageKey.QUARTERFINAL]: rules.find((rule) => rule.stageKey === rankingStageKey.QUARTERFINAL)?.points ?? 0,
    [rankingStageKey.PARTICIPATION]: rules.find((rule) => rule.stageKey === rankingStageKey.PARTICIPATION)?.points ?? 0
  };
}

async function recalculateTournamentRankingPointsTx(tx: Prisma.TransactionClient, tournamentId: string) {
  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      ranking: {
        select: {
          rules: {
            select: {
              stageKey: true,
              points: true
            }
          }
        }
      },
      pairs: {
        select: {
          id: true,
          players: {
            select: {
              playerId: true
            }
          }
        }
      },
      matches: {
        select: {
          stage: true,
          homePairId: true,
          awayPairId: true,
          winnerPairId: true
        }
      }
    }
  });

  if (!tournament) {
    return;
  }

  if (!tournament.ranking) {
    await tx.tournamentPlayer.updateMany({
      where: { tournamentId },
      data: {
        tournamentPoints: 0
      }
    });
    return;
  }

  const ruleMap = buildRankingRuleMap(tournament.ranking.rules);
  const playerIdsByPairId = new Map(
    tournament.pairs.map((pair) => [pair.id, pair.players.map((pairPlayer) => pairPlayer.playerId)])
  );

  await tx.tournamentPlayer.updateMany({
    where: { tournamentId },
    data: {
      tournamentPoints: ruleMap.PARTICIPATION
    }
  });

  const quarterfinalLosers = new Set<string>();
  const semifinalLosers = new Set<string>();
  const runnerUpPlayers = new Set<string>();
  const championPlayers = new Set<string>();

  for (const match of tournament.matches) {
    const loserPairId = getMatchLoserPairId(match);

    if (match.stage === matchStage.QUARTERFINAL && loserPairId) {
      for (const playerId of playerIdsByPairId.get(loserPairId) ?? []) {
        quarterfinalLosers.add(playerId);
      }
    }

    if (match.stage === matchStage.SEMIFINAL && loserPairId) {
      for (const playerId of playerIdsByPairId.get(loserPairId) ?? []) {
        semifinalLosers.add(playerId);
      }
    }

    if (match.stage === matchStage.FINAL) {
      if (loserPairId) {
        for (const playerId of playerIdsByPairId.get(loserPairId) ?? []) {
          runnerUpPlayers.add(playerId);
        }
      }

      if (match.winnerPairId) {
        for (const playerId of playerIdsByPairId.get(match.winnerPairId) ?? []) {
          championPlayers.add(playerId);
        }
      }
    }
  }

  if (quarterfinalLosers.size) {
    await tx.tournamentPlayer.updateMany({
      where: {
        tournamentId,
        playerId: {
          in: [...quarterfinalLosers]
        }
      },
      data: {
        tournamentPoints: ruleMap.QUARTERFINAL
      }
    });
  }

  if (semifinalLosers.size) {
    await tx.tournamentPlayer.updateMany({
      where: {
        tournamentId,
        playerId: {
          in: [...semifinalLosers]
        }
      },
      data: {
        tournamentPoints: ruleMap.SEMIFINAL
      }
    });
  }

  if (runnerUpPlayers.size) {
    await tx.tournamentPlayer.updateMany({
      where: {
        tournamentId,
        playerId: {
          in: [...runnerUpPlayers]
        }
      },
      data: {
        tournamentPoints: ruleMap.RUNNER_UP
      }
    });
  }

  if (championPlayers.size) {
    await tx.tournamentPlayer.updateMany({
      where: {
        tournamentId,
        playerId: {
          in: [...championPlayers]
        }
      },
      data: {
        tournamentPoints: ruleMap.CHAMPION
      }
    });
  }

  const tournamentEntries = await tx.tournamentPlayer.findMany({
    where: { tournamentId },
    select: {
      playerId: true,
      seedPoints: true,
      tournamentPoints: true
    }
  });

  await Promise.all(
    tournamentEntries.map((entry) =>
      tx.player.update({
        where: { id: entry.playerId },
        data: {
          points: entry.seedPoints + entry.tournamentPoints
        }
      })
    )
  );
}

export async function recalculateTournamentRankingPoints(tournamentId: string) {
  await prisma.$transaction(async (tx) => {
    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });
}

async function clearFollowingMatches(tx: Prisma.TransactionClient, tournamentId: string, label: string) {
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

async function clearKnockoutMatches(tx: Prisma.TransactionClient, tournamentId: string) {
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

async function buildGroupStandings(tx: Prisma.TransactionClient, tournamentId: string): Promise<GroupStandingEntry[]> {
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

async function assignWinnerToNextMatch(
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

function buildGroupQualificationMap(standings: GroupStandingEntry[], knockoutSize: number) {
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

async function buildQualifiedStandings(tx: Prisma.TransactionClient, tournamentId: string): Promise<RankedPair[]> {
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

async function seedKnockoutFromGroupStandings(tx: Prisma.TransactionClient, tournamentId: string) {
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

  await prisma.$transaction(async (tx) => {
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

async function resetTournamentStructure(tx: Prisma.TransactionClient, tournamentId: string) {
  await tx.match.deleteMany({
    where: { tournamentId }
  });

  await tx.tournamentGroup.deleteMany({
    where: { tournamentId }
  });
}

async function resetTournamentDraw(tx: Prisma.TransactionClient, tournamentId: string) {
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

async function resequenceTournamentPairs(tx: Prisma.TransactionClient, tournamentId: string) {
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

export async function getArenaDashboard(arenaId: string) {
  const activeTournament = await prisma.tournament.findFirst({
    where: {
      arenaId,
      status: {
        not: tournamentStatus.FINISHED
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      ranking: true,
      entries: {
        include: {
          player: true
        },
        orderBy: {
          seedPoints: "desc"
        }
      },
      pairs: {
        include: {
          players: {
            include: {
              player: true
            },
            orderBy: {
              slot: "asc"
            }
          },
          group: true
        },
        orderBy: {
          totalPoints: "desc"
        }
      },
      groups: {
        include: {
          pairs: {
            orderBy: {
              totalPoints: "desc"
            }
          }
        },
        orderBy: {
          drawOrder: "asc"
        }
      },
      matches: {
        include: {
          group: true,
          homePair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          awayPair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          winnerPair: true
        },
        orderBy: [
          { stage: "asc" },
          { roundOrder: "asc" }
        ]
      }
      ,
      categories: {
        where: {
          active: true
        },
        orderBy: {
          level: "asc"
        }
      }
    }
  });

  const players = await prisma.player.findMany({
    where: { arenaId },
    orderBy: {
      points: "desc"
    }
  });

  const tournamentHistory = await prisma.tournament.findMany({
    where: {
      arenaId,
      status: tournamentStatus.FINISHED
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      _count: {
        select: {
          entries: true,
          pairs: true,
          groups: true,
          matches: true
        }
      }
    }
  });

  return {
    players,
    activeTournament,
    tournamentHistory
  };
}

export async function getFinishedTournamentDetails(tournamentId: string, arenaId: string) {
  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId,
      status: tournamentStatus.FINISHED
    },
    include: {
      entries: {
        include: {
          player: true
        },
        orderBy: {
          seedPoints: "desc"
        }
      },
      pairs: {
        include: {
          players: {
            include: {
              player: true
            },
            orderBy: {
              slot: "asc"
            }
          },
          group: true
        },
        orderBy: [
          { totalPoints: "desc" },
          { drawOrder: "asc" }
        ]
      },
      groups: {
        include: {
          pairs: {
            orderBy: {
              totalPoints: "desc"
            }
          }
        },
        orderBy: {
          drawOrder: "asc"
        }
      },
      matches: {
        include: {
          group: true,
          homePair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          awayPair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          winnerPair: true
        },
        orderBy: [
          { stage: "asc" },
          { roundOrder: "asc" }
        ]
      }
    }
  });

  return tournament;
}

export async function getTournamentDetailsById(tournamentId: string, arenaId: string) {
  return prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId
    },
    include: {
      ranking: true,
      categories: {
        where: { active: true },
        orderBy: { level: "asc" }
      },
      entries: {
        include: { player: true },
        orderBy: { seedPoints: "desc" }
      },
      pairs: {
        include: {
          players: {
            include: { player: true },
            orderBy: { slot: "asc" }
          },
          group: true
        },
        orderBy: [{ totalPoints: "desc" }, { drawOrder: "asc" }]
      },
      groups: {
        include: {
          pairs: {
            orderBy: { totalPoints: "desc" }
          }
        },
        orderBy: { drawOrder: "asc" }
      },
      matches: {
        include: {
          group: true,
          homePair: true,
          awayPair: true,
          winnerPair: true
        },
        orderBy: [{ stage: "asc" }, { roundOrder: "asc" }]
      }
    }
  });
}

export async function getTournamentScheduleConflicts(tournamentId: string, arenaId: string) {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId,
      tournament: {
        arenaId
      },
      scheduledTime: {
        not: null
      }
    },
    include: {
      homePair: {
        include: {
          players: true
        }
      },
      awayPair: {
        include: {
          players: true
        }
      }
    }
  });

  const conflicts: Array<{
    scheduledTime: string;
    playerId: string;
    matchIds: string[];
    labels: string[];
  }> = [];

  const slotByPlayer = new Map<string, Map<string, { matchId: string; label: string }[]>>();
  for (const match of matches) {
    if (!match.scheduledTime) continue;
    const playerIds = [
      ...(match.homePair?.players.map((pairPlayer) => pairPlayer.playerId) ?? []),
      ...(match.awayPair?.players.map((pairPlayer) => pairPlayer.playerId) ?? [])
    ];

    for (const playerId of playerIds) {
      const perPlayer = slotByPlayer.get(playerId) ?? new Map<string, { matchId: string; label: string }[]>();
      const list = perPlayer.get(match.scheduledTime) ?? [];
      list.push({ matchId: match.id, label: match.label });
      perPlayer.set(match.scheduledTime, list);
      slotByPlayer.set(playerId, perPlayer);
    }
  }

  for (const [playerId, slots] of slotByPlayer.entries()) {
    for (const [scheduledTime, items] of slots.entries()) {
      if (items.length > 1) {
        conflicts.push({
          playerId,
          scheduledTime,
          matchIds: items.map((item) => item.matchId),
          labels: items.map((item) => item.label)
        });
      }
    }
  }

  return conflicts;
}

export async function syncTournamentEntries(tournamentId: string, arenaId: string, selectedPlayerIds: string[]) {
  const uniquePlayerIds = [...new Set(selectedPlayerIds)];
  const selectedPlayerIdSet = new Set(uniquePlayerIds);
  const players = await prisma.player.findMany({
    where: {
      arenaId,
      active: true,
      id: {
        in: uniquePlayerIds
      }
    },
    orderBy: {
      points: "desc"
    }
  });

  if (players.length !== uniquePlayerIds.length) {
    throw new Error("Um ou mais jogadores selecionados nÃ£o estÃ£o disponÃ­veis para este torneio.");
  }

  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId
    },
    include: {
      entries: true,
      pairs: {
        include: {
          players: true
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  const existingPlayerIdSet = new Set(tournament.entries.map((entry) => entry.playerId));
  const playerIdsToAdd = uniquePlayerIds.filter((playerId) => !existingPlayerIdSet.has(playerId));
  const playerIdsToRemove = tournament.entries
    .map((entry) => entry.playerId)
    .filter((playerId) => !selectedPlayerIdSet.has(playerId));
  const removedPlayerIdSet = new Set(playerIdsToRemove);
  const pairsToRemove = tournament.pairs.filter((pair) =>
    pair.players.some((pairPlayer) => removedPlayerIdSet.has(pairPlayer.playerId))
  );
  const shouldResetStructure = pairsToRemove.length > 0;

  await prisma.$transaction(async (tx) => {
    if (shouldResetStructure) {
      await resetTournamentStructure(tx, tournamentId);
    }

    if (pairsToRemove.length) {
      const pairIdsToRemove = pairsToRemove.map((pair) => pair.id);

      await tx.pairPlayer.deleteMany({
        where: {
          pairId: {
            in: pairIdsToRemove
          }
        }
      });

      await tx.pair.deleteMany({
        where: {
          id: {
            in: pairIdsToRemove
          }
        }
      });
    }

    if (playerIdsToRemove.length) {
      await tx.tournamentPlayer.deleteMany({
        where: {
          tournamentId,
          playerId: {
            in: playerIdsToRemove
          }
        }
      });
    }

    const playersToAdd = players.filter((player) => playerIdsToAdd.includes(player.id));

    if (playersToAdd.length) {
      await tx.tournamentPlayer.createMany({
        data: playersToAdd.map((player) => ({
          tournamentId,
          playerId: player.id,
          seedPoints: player.points,
          tournamentPoints: 0
        }))
      });
    }

    if (pairsToRemove.length) {
      await resequenceTournamentPairs(tx, tournamentId);
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: !uniquePlayerIds.length
          ? tournamentStatus.DRAFT
          : shouldResetStructure || tournament.status === tournamentStatus.DRAFT
            ? tournamentStatus.READY_FOR_DRAW
            : tournament.status
      }
    });

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return players.length;
}

export async function generateTournamentPairs(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      entries: {
        include: {
          player: true
        },
        orderBy: {
          seedPoints: "desc"
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  const { pairs, waitlist } = generateBalancedPairs(
    tournament.entries.map((entry) => ({
      id: entry.playerId,
      name: entry.player.name,
      points: entry.seedPoints
    }))
  );

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({
      where: { tournamentId }
    });

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

    await tx.tournamentGroup.deleteMany({
      where: { tournamentId }
    });

    for (const [index, pair] of pairs.entries()) {
      const createdPair = await tx.pair.create({
        data: {
          tournamentId,
          drawOrder: index + 1,
          name: `${pair.playerAName} / ${pair.playerBName}`,
          totalPoints: pair.totalPoints
        }
      });

      await tx.pairPlayer.createMany({
        data: [
          {
            pairId: createdPair.id,
            playerId: pair.playerAId,
            slot: 1
          },
          {
            pairId: createdPair.id,
            playerId: pair.playerBId,
            slot: 2
          }
        ]
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: tournamentStatus.READY_FOR_DRAW
      }
    });

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return {
    pairCount: pairs.length,
    waitlist
  };
}

export async function createTournamentPair(tournamentId: string, playerAId: string, playerBId: string) {
  if (playerAId === playerBId) {
    throw new Error("Selecione dois jogadores diferentes para montar a dupla.");
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      entries: {
        include: {
          player: true
        }
      },
      pairs: {
        include: {
          players: true
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  const entryByPlayerId = new Map(
    tournament.entries.map((entry) => [
      entry.playerId,
      {
        points: entry.seedPoints,
        name: entry.player.name
      }
    ])
  );

  const playerA = entryByPlayerId.get(playerAId);
  const playerB = entryByPlayerId.get(playerBId);

  if (!playerA || !playerB) {
    throw new Error("Os dois jogadores precisam estar na lista deste torneio.");
  }

  const pairedPlayerIds = new Set(
    tournament.pairs.flatMap((pair) => pair.players.map((player) => player.playerId))
  );

  if (pairedPlayerIds.has(playerAId) || pairedPlayerIds.has(playerBId)) {
    throw new Error("Um dos jogadores selecionados jÃ¡ faz parte de outra dupla.");
  }

  await prisma.$transaction(async (tx) => {
    await resetTournamentStructure(tx, tournamentId);

    const createdPair = await tx.pair.create({
      data: {
        tournamentId,
        drawOrder: tournament.pairs.length + 1,
        name: `${playerA.name} / ${playerB.name}`,
        totalPoints: playerA.points + playerB.points
      }
    });

    await tx.pairPlayer.createMany({
      data: [
        {
          pairId: createdPair.id,
          playerId: playerAId,
          slot: 1
        },
        {
          pairId: createdPair.id,
          playerId: playerBId,
          slot: 2
        }
      ]
    });

    await resequenceTournamentPairs(tx, tournamentId);

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: tournamentStatus.READY_FOR_DRAW
      }
    });

    await recalculateTournamentRankingPointsTx(tx, tournamentId);
  });

  return true;
}

export async function updateTournamentPair(pairId: string, arenaId: string, playerAId: string, playerBId: string) {
  if (playerAId === playerBId) {
    throw new Error("Selecione dois jogadores diferentes para montar a dupla.");
  }

  const pair = await prisma.pair.findFirst({
    where: {
      id: pairId,
      tournament: {
        arenaId
      }
    },
    include: {
      tournament: {
        include: {
          entries: {
            include: {
              player: true
            }
          },
          pairs: {
            include: {
              players: true
            }
          }
        }
      }
    }
  });

  if (!pair) {
    throw new Error("Dupla nÃ£o encontrada.");
  }

  const entryByPlayerId = new Map(
    pair.tournament.entries.map((entry) => [
      entry.playerId,
      {
        points: entry.seedPoints,
        name: entry.player.name
      }
    ])
  );

  const playerA = entryByPlayerId.get(playerAId);
  const playerB = entryByPlayerId.get(playerBId);

  if (!playerA || !playerB) {
    throw new Error("Os dois jogadores precisam estar na lista deste torneio.");
  }

  const pairedPlayerIds = new Set(
    pair.tournament.pairs
      .filter((tournamentPair) => tournamentPair.id !== pairId)
      .flatMap((tournamentPair) => tournamentPair.players.map((player) => player.playerId))
  );

  if (pairedPlayerIds.has(playerAId) || pairedPlayerIds.has(playerBId)) {
    throw new Error("Um dos jogadores selecionados jÃ¡ faz parte de outra dupla.");
  }

  await prisma.$transaction(async (tx) => {
    await resetTournamentStructure(tx, pair.tournamentId);

    await tx.pair.update({
      where: { id: pairId },
      data: {
        name: `${playerA.name} / ${playerB.name}`,
        totalPoints: playerA.points + playerB.points,
        groupId: null
      }
    });

    await tx.pairPlayer.deleteMany({
      where: { pairId }
    });

    await tx.pairPlayer.createMany({
      data: [
        {
          pairId,
          playerId: playerAId,
          slot: 1
        },
        {
          pairId,
          playerId: playerBId,
          slot: 2
        }
      ]
    });

    await resequenceTournamentPairs(tx, pair.tournamentId);

    await tx.tournament.update({
      where: { id: pair.tournamentId },
      data: {
        status: tournamentStatus.READY_FOR_DRAW
      }
    });

    await recalculateTournamentRankingPointsTx(tx, pair.tournamentId);
  });

  return true;
}

export async function deleteTournamentPair(pairId: string, arenaId: string) {
  const pair = await prisma.pair.findFirst({
    where: {
      id: pairId,
      tournament: {
        arenaId
      }
    },
    include: {
      tournament: true
    }
  });

  if (!pair) {
    throw new Error("Dupla nÃ£o encontrada.");
  }

  await prisma.$transaction(async (tx) => {
    await resetTournamentStructure(tx, pair.tournamentId);

    await tx.pairPlayer.deleteMany({
      where: { pairId }
    });

    await tx.pair.delete({
      where: { id: pairId }
    });

    await resequenceTournamentPairs(tx, pair.tournamentId);

    await tx.tournament.update({
      where: { id: pair.tournamentId },
      data: {
        status: tournamentStatus.READY_FOR_DRAW
      }
    });

    await recalculateTournamentRankingPointsTx(tx, pair.tournamentId);
  });

  return true;
}

export async function distributeTournamentGroups(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
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

  await prisma.$transaction(async (tx) => {
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

function getKnockoutSize(groupCount: number, pairCount: number) {
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

function buildKnockoutSkeleton(groupCount: number, pairCount: number) {
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

export async function generateTournamentMatches(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
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

  await prisma.$transaction(async (tx) => {
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

export async function finishTournament(tournamentId: string, arenaId: string) {
  const updated = await prisma.tournament.updateMany({
    where: {
      id: tournamentId,
      arenaId,
      status: {
        not: tournamentStatus.FINISHED
      }
    },
    data: {
      status: tournamentStatus.FINISHED
    }
  });

  if (!updated.count) {
    throw new Error("Torneio nÃ£o encontrado ou jÃ¡ finalizado.");
  }

  return true;
}

export async function deleteTournament(tournamentId: string, arenaId: string) {
  const deleted = await prisma.tournament.deleteMany({
    where: {
      id: tournamentId,
      arenaId
    }
  });

  if (!deleted.count) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  return true;
}

export async function moveTournamentPairToGroup(pairId: string, targetGroupId: string, arenaId: string) {
  const pair = await prisma.pair.findFirst({
    where: {
      id: pairId,
      tournament: {
        arenaId
      }
    },
    select: {
      id: true,
      tournamentId: true,
      groupId: true
    }
  });

  if (!pair) {
    throw new Error("Dupla nÃ£o encontrada.");
  }

  const targetGroup = await prisma.tournamentGroup.findFirst({
    where: {
      id: targetGroupId,
      tournamentId: pair.tournamentId,
      tournament: {
        arenaId
      }
    },
    select: {
      id: true
    }
  });

  if (!targetGroup) {
    throw new Error("Grupo de destino nÃ£o encontrado.");
  }

  if (pair.groupId === targetGroup.id) {
    return true;
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({
      where: {
        tournamentId: pair.tournamentId
      }
    });

    await tx.pair.update({
      where: { id: pair.id },
      data: {
        groupId: targetGroup.id
      }
    });

    await tx.tournament.update({
      where: { id: pair.tournamentId },
      data: {
        status: tournamentStatus.GROUPS_DEFINED
      }
    });

    await recalculateTournamentRankingPointsTx(tx, pair.tournamentId);
  });

  return true;
}

export async function updateTournamentSettings(
  tournamentId: string,
  arenaId: string,
  input: {
    name: string;
    description: string;
    publicSlug: string;
    registrationPhase: string;
    groupCount: number;
    pairsPerGroup: number;
    priceFirstCents: number;
    priceSecondCents: number;
    priceThirdCents: number;
    blockCategoryGap: boolean;
    maxCategoryGap: number;
    categoryList: Array<{ name: string; level: number }>;
    rankingId: string | null;
  }
) {
  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId
    },
    select: {
      id: true,
      groupCount: true,
      pairsPerGroup: true,
      _count: {
        select: {
          entries: true
        }
      }
    }
  });

  if (!tournament) {
    throw new Error("Torneio nÃ£o encontrado.");
  }

  const structureChanged =
    tournament.groupCount !== input.groupCount ||
    tournament.pairsPerGroup !== input.pairsPerGroup;

  await prisma.$transaction(async (tx) => {
    if (structureChanged) {
      await resetTournamentStructure(tx, tournamentId);
      await tx.pair.updateMany({
        where: { tournamentId },
        data: {
          groupId: null
        }
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        name: input.name,
        description: input.description,
        publicSlug: input.publicSlug,
        registrationPhase: input.registrationPhase,
        groupCount: input.groupCount,
        pairsPerGroup: input.pairsPerGroup,
        priceFirstCents: input.priceFirstCents,
        priceSecondCents: input.priceSecondCents,
        priceThirdCents: input.priceThirdCents,
        blockCategoryGap: input.blockCategoryGap,
        maxCategoryGap: input.maxCategoryGap,
        rankingId: input.rankingId,
        ...(structureChanged
          ? {
              status: tournament._count.entries ? tournamentStatus.READY_FOR_DRAW : tournamentStatus.DRAFT
            }
          : {})
      }
    });

    await tx.tournamentCategory.deleteMany({
      where: {
        tournamentId
      }
    });

    await tx.tournamentCategory.createMany({
      data: input.categoryList.map((category) => ({
        tournamentId,
        name: category.name,
        level: category.level
      }))
    });

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

  await prisma.$transaction(async (tx) => {
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

  await prisma.$transaction(async (tx) => {
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


