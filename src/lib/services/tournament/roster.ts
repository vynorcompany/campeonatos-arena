import "server-only";
import { recalculateTournamentRankingPointsTx } from "@/lib/services/tournament-ranking";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { withArenaTransaction } from "@/lib/rls";
import { generateBalancedPairs } from "@/lib/services/balancing";
import { resequenceTournamentPairs, resetTournamentStructure, tournamentStatus } from "@/lib/services/tournament/shared";

export async function syncTournamentEntries(tournamentId: string, arenaId: string, selectedPlayerIds: string[]) {
  const uniquePlayerIds = [...new Set(selectedPlayerIds)];
  const selectedPlayerIdSet = new Set(uniquePlayerIds);
  const players = await arenaDatabase(arenaId).player.findMany({
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

  await withArenaTransaction(arenaId, async (tx) => {
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

export async function generateTournamentPairs(tournamentId: string, arenaId: string) {
  const tournament = await arenaDatabase(arenaId).tournament.findFirst({
    where: { id: tournamentId, arenaId },
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

  if (tournament.entries.length < 2) {
    throw new Error("Inscreva ao menos dois atletas antes de gerar as duplas.");
  }

  const { pairs, waitlist } = generateBalancedPairs(
    tournament.entries.map((entry) => ({
      id: entry.playerId,
      name: entry.player.name,
      points: entry.seedPoints
    }))
  );

  await withArenaTransaction(arenaId, async (tx) => {
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

export async function createTournamentPair(tournamentId: string, arenaId: string, playerAId: string, playerBId: string) {
  if (playerAId === playerBId) {
    throw new Error("Selecione dois jogadores diferentes para montar a dupla.");
  }

  const tournament = await arenaDatabase(arenaId).tournament.findFirst({
    where: { id: tournamentId, arenaId },
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

  await withArenaTransaction(arenaId, async (tx) => {
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

  const pair = await arenaDatabase(arenaId).pair.findFirst({
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

  await withArenaTransaction(arenaId, async (tx) => {
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

export async function updateTournamentPairPoints(pairId: string, arenaId: string, totalPoints: number) {
  const pair = await prisma.pair.findFirst({
    where: {
      id: pairId,
      tournament: {
        arenaId
      }
    },
    select: {
      id: true,
      tournamentId: true
    }
  });

  if (!pair) {
    throw new Error("Dupla não encontrada.");
  }

  await withArenaTransaction(arenaId, async (tx) => {
    await resetTournamentStructure(tx, pair.tournamentId);

    await tx.pair.update({
      where: { id: pair.id },
      data: {
        totalPoints: Math.max(0, Math.trunc(totalPoints))
      }
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

  await withArenaTransaction(arenaId, async (tx) => {
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

  await withArenaTransaction(arenaId, async (tx) => {
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
