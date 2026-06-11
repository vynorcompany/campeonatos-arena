import { prisma } from "@/lib/prisma";

export type RankingLeaderboardPlayer = {
  playerId: string;
  playerName: string;
  playerActive: boolean;
  playerPhotoUrl: string;
  points: number;
  tournamentsPlayed: number;
  lastTournamentId: string | null;
  lastTournamentName: string | null;
  lastTournamentStatus: string | null;
  lastTournamentAt: Date | null;
};

export type RankingProfileWithLeaderboard = {
  id: string;
  name: string;
  description: string;
  rules: Array<{
    stageKey: string;
    points: number;
    displayOrder: number;
  }>;
  tournaments: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: Date;
  }>;
  _count: {
    tournaments: number;
  };
  leaderboard: RankingLeaderboardPlayer[];
  linkedPlayers: number;
  linkedTournamentEntries: number;
};

type RankingSourceEntry = {
  playerId: string;
  tournamentPoints: number;
  tournament: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
  };
  player: {
    name: string;
    active: boolean;
    photoUrl: string;
  };
};

function buildRankingLeaderboard(entries: RankingSourceEntry[]) {
  const grouped = new Map<string, RankingLeaderboardPlayer>();

  for (const entry of entries) {
    const current = grouped.get(entry.playerId) ?? {
      playerId: entry.playerId,
      playerName: entry.player.name,
      playerActive: entry.player.active,
      playerPhotoUrl: entry.player.photoUrl,
      points: 0,
      tournamentsPlayed: 0,
      lastTournamentId: null,
      lastTournamentName: null,
      lastTournamentStatus: null,
      lastTournamentAt: null
    };

    current.points += entry.tournamentPoints;
    current.tournamentsPlayed += 1;

    if (!current.lastTournamentAt || entry.tournament.createdAt > current.lastTournamentAt) {
      current.lastTournamentAt = entry.tournament.createdAt;
      current.lastTournamentId = entry.tournament.id;
      current.lastTournamentName = entry.tournament.name;
      current.lastTournamentStatus = entry.tournament.status;
    }

    grouped.set(entry.playerId, current);
  }

  return [...grouped.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.tournamentsPlayed !== a.tournamentsPlayed) return b.tournamentsPlayed - a.tournamentsPlayed;
    return a.playerName.localeCompare(b.playerName);
  });
}

async function getRankingSourceEntries(arenaId: string, rankingId: string) {
  return prisma.tournamentPlayer.findMany({
    where: {
      tournament: {
        arenaId,
        rankingId
      }
    },
    select: {
      playerId: true,
      tournamentPoints: true,
      tournament: {
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true
        }
      },
      player: {
        select: {
          name: true,
          active: true,
          photoUrl: true
        }
      }
    }
  });
}

export async function getRankingProfilesWithLeaderboard(arenaId: string): Promise<RankingProfileWithLeaderboard[]> {
  const rankings = await prisma.rankingProfile.findMany({
    where: { arenaId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      rules: {
        orderBy: [{ displayOrder: "asc" }]
      },
      tournaments: {
        where: {
          status: {
            not: "FINISHED"
          }
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          tournaments: true
        }
      }
    }
  });

  if (!rankings.length) {
    return [];
  }

  const rankingIds = rankings.map((ranking) => ranking.id);
  const sourceEntries = await prisma.tournamentPlayer.findMany({
    where: {
      tournament: {
        arenaId,
        rankingId: {
          in: rankingIds
        }
      }
    },
    select: {
      playerId: true,
      tournamentPoints: true,
      tournament: {
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          rankingId: true
        }
      },
      player: {
        select: {
          name: true,
          active: true,
          photoUrl: true
        }
      }
    }
  });

  const entriesByRankingId = new Map<string, RankingSourceEntry[]>();

  for (const entry of sourceEntries) {
    const current = entriesByRankingId.get(entry.tournament.rankingId ?? "") ?? [];
    current.push(entry);
    entriesByRankingId.set(entry.tournament.rankingId ?? "", current);
  }

  return rankings.map((ranking) => {
    const rankingEntries = entriesByRankingId.get(ranking.id) ?? [];
    const leaderboard = buildRankingLeaderboard(rankingEntries);

    return {
      id: ranking.id,
      name: ranking.name,
      description: ranking.description,
      rules: ranking.rules,
      tournaments: ranking.tournaments,
      _count: ranking._count,
      leaderboard,
      linkedPlayers: leaderboard.length,
      linkedTournamentEntries: rankingEntries.length
    };
  });
}

export async function getRankingProfileLeaderboard(arenaId: string, rankingId: string) {
  const ranking = await prisma.rankingProfile.findFirst({
    where: {
      id: rankingId,
      arenaId
    },
    include: {
      rules: {
        orderBy: [{ displayOrder: "asc" }]
      },
      tournaments: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true
        }
      },
      _count: {
        select: {
          tournaments: true
        }
      }
    }
  });

  if (!ranking) {
    return null;
  }

  const sourceEntries = await getRankingSourceEntries(arenaId, ranking.id);
  const leaderboard = buildRankingLeaderboard(sourceEntries);

  return {
    id: ranking.id,
    name: ranking.name,
    description: ranking.description,
    rules: ranking.rules,
    tournaments: ranking.tournaments,
    _count: ranking._count,
    leaderboard,
    linkedPlayers: leaderboard.length,
    linkedTournamentEntries: sourceEntries.length
  };
}
