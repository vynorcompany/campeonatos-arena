import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRoundRobin, distributePairsIntoGroups, generateBalancedPairs } from "@/lib/services/balancing";
import type { MatchStage, TournamentStatus } from "@/types/tournament";

const MIN_PAIRS_PER_GROUP = 2;

const tournamentStatus = {
  DRAFT: "DRAFT",
  READY_FOR_DRAW: "READY_FOR_DRAW",
  GROUPS_DEFINED: "GROUPS_DEFINED",
  MATCHES_DEFINED: "MATCHES_DEFINED",
  FINISHED: "FINISHED"
} satisfies Record<string, TournamentStatus>;

const matchStage = {
  GROUP: "GROUP",
  QUARTERFINAL: "QUARTERFINAL",
  SEMIFINAL: "SEMIFINAL",
  FINAL: "FINAL"
} satisfies Record<string, MatchStage>;

function getNextKnockoutTarget(label: string) {
  if (label.startsWith("QF 1")) {
    return { nextLabel: "SF 1 - Vencedor QF1 x Vencedor QF2", slot: "homePairId" as const };
  }

  if (label.startsWith("QF 2")) {
    return { nextLabel: "SF 1 - Vencedor QF1 x Vencedor QF2", slot: "awayPairId" as const };
  }

  if (label.startsWith("QF 3")) {
    return { nextLabel: "SF 2 - Vencedor QF3 x Vencedor QF4", slot: "homePairId" as const };
  }

  if (label.startsWith("QF 4")) {
    return { nextLabel: "SF 2 - Vencedor QF3 x Vencedor QF4", slot: "awayPairId" as const };
  }

  if (label.startsWith("SF 1")) {
    return { nextLabel: "Final", slot: "homePairId" as const };
  }

  if (label.startsWith("SF 2")) {
    return { nextLabel: "Final", slot: "awayPairId" as const };
  }

  return null;
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
          homePair: true,
          awayPair: true,
          winnerPair: true
        },
        orderBy: [
          { stage: "asc" },
          { roundOrder: "asc" }
        ]
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
          homePair: true,
          awayPair: true,
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

export async function syncTournamentEntries(tournamentId: string, arenaId: string, selectedPlayerIds: string[]) {
  const uniquePlayerIds = [...new Set(selectedPlayerIds)];
  const players = await prisma.player.findMany({
    where: {
      arenaId,
      active: true,
      ...(uniquePlayerIds.length
        ? {
            id: {
              in: uniquePlayerIds
            }
          }
        : {})
    },
    orderBy: {
      points: "desc"
    }
  });

  if (players.length !== uniquePlayerIds.length) {
    throw new Error("Um ou mais jogadores selecionados não estão disponíveis para este torneio.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentPlayer.deleteMany({
      where: { tournamentId }
    });

    await resetTournamentDraw(tx, tournamentId);

    if (players.length) {
      await tx.tournamentPlayer.createMany({
        data: players.map((player) => ({
          tournamentId,
          playerId: player.id,
          seedPoints: player.points,
          tournamentPoints: 0
        }))
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: players.length ? tournamentStatus.READY_FOR_DRAW : tournamentStatus.DRAFT
      }
    });
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
    throw new Error("Torneio não encontrado.");
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
    throw new Error("Torneio não encontrado.");
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
    throw new Error("Um dos jogadores selecionados já faz parte de outra dupla.");
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
    throw new Error("Dupla não encontrada.");
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
    throw new Error("Torneio não encontrado.");
  }

  if (!tournament.pairs.length) {
    throw new Error("Monte as duplas antes de organizar os grupos.");
  }

  const minimumRequiredPairs = tournament.groupCount * MIN_PAIRS_PER_GROUP;

  if (tournament.pairs.length < minimumRequiredPairs) {
    throw new Error(
      `São necessárias pelo menos ${minimumRequiredPairs} duplas para montar ${tournament.groupCount} grupos com no mínimo ${MIN_PAIRS_PER_GROUP} duplas por grupo.`
    );
  }

  const groups = distributePairsIntoGroups(tournament.pairs, tournament.groupCount);

  if (groups.some((group) => group.pairs.length < MIN_PAIRS_PER_GROUP)) {
    throw new Error("Não foi possível distribuir as duplas respeitando o mínimo por grupo.");
  }

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
  });

  return groups.length;
}

function buildKnockoutSkeleton(groupCount: number) {
  if (groupCount >= 4) {
    return [
      { stage: matchStage.QUARTERFINAL, label: "QF 1 - A1 x D2", roundOrder: 1 },
      { stage: matchStage.QUARTERFINAL, label: "QF 2 - B1 x C2", roundOrder: 2 },
      { stage: matchStage.QUARTERFINAL, label: "QF 3 - C1 x B2", roundOrder: 3 },
      { stage: matchStage.QUARTERFINAL, label: "QF 4 - D1 x A2", roundOrder: 4 },
      { stage: matchStage.SEMIFINAL, label: "SF 1 - Vencedor QF1 x Vencedor QF2", roundOrder: 5 },
      { stage: matchStage.SEMIFINAL, label: "SF 2 - Vencedor QF3 x Vencedor QF4", roundOrder: 6 },
      { stage: matchStage.FINAL, label: "Final", roundOrder: 7 }
    ];
  }

  if (groupCount >= 2) {
    return [
      { stage: matchStage.SEMIFINAL, label: "SF 1 - A1 x B2", roundOrder: 1 },
      { stage: matchStage.SEMIFINAL, label: "SF 2 - B1 x A2", roundOrder: 2 },
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
    throw new Error("Torneio não encontrado.");
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

    for (const match of buildKnockoutSkeleton(tournament.groupCount)) {
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
    throw new Error("Torneio não encontrado ou já finalizado.");
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
    throw new Error("Torneio não encontrado.");
  }

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
    throw new Error("Jogo não encontrado.");
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
      return;
    }

    if (match.winnerPairId && match.winnerPairId !== winnerPairId) {
      await clearFollowingMatches(tx, match.tournamentId, match.label);
    }

    const target = getNextKnockoutTarget(match.label);

    if (!target) {
      return;
    }

    const nextMatch = await tx.match.findFirst({
      where: {
        tournamentId: match.tournamentId,
        label: target.nextLabel
      }
    });

    if (!nextMatch) {
      return;
    }

    await tx.match.update({
      where: { id: nextMatch.id },
      data: {
        [target.slot]: winnerPairId
      }
    });
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
    throw new Error("Jogo não encontrado.");
  }

  if (match.stage === matchStage.GROUP) {
    throw new Error("A definição manual de confronto só vale para o mata-mata.");
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
  });

  return true;
}
