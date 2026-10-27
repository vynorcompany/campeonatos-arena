import type { Prisma } from "@prisma/client";

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

export async function recalculateTournamentRankingPointsTx(tx: Prisma.TransactionClient, tournamentId: string) {
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

    if (match.stage === "QUARTERFINAL" && loserPairId) {
      for (const playerId of playerIdsByPairId.get(loserPairId) ?? []) {
        quarterfinalLosers.add(playerId);
      }
    }

    if (match.stage === "SEMIFINAL" && loserPairId) {
      for (const playerId of playerIdsByPairId.get(loserPairId) ?? []) {
        semifinalLosers.add(playerId);
      }
    }

    if (match.stage === "FINAL") {
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
