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

export type RankingCycleSummary = {
  id: string;
  label: string;
  startedAt: Date;
  endedAt: Date | null;
  isCurrent: boolean;
  tournamentCount: number;
  entryCount: number;
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
  cycles: RankingCycleSummary[];
  selectedCycleId: string;
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

type RankingCycleSource = {
  id: string;
  label: string;
  startedAt: Date;
  endedAt: Date | null;
};

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

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

function buildTournamentSummaries(entries: RankingSourceEntry[]) {
  const tournaments = new Map<string, {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
  }>();

  for (const entry of entries) {
    if (!tournaments.has(entry.tournament.id)) {
      tournaments.set(entry.tournament.id, entry.tournament);
    }
  }

  return [...tournaments.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function isEntryInCycle(entry: RankingSourceEntry, cycle: RankingCycleSource) {
  return getMonthKey(entry.tournament.createdAt) === getMonthKey(cycle.startedAt);
}

function getCurrentCycle(cycles: RankingCycleSource[]) {
  const currentMonthKey = getMonthKey(new Date());
  return cycles.find((cycle) => getMonthKey(cycle.startedAt) === currentMonthKey) ?? cycles[cycles.length - 1] ?? null;
}

function buildCycleLabel(index: number, cycle: RankingCycleSource) {
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(cycle.startedAt);
  const year = cycle.startedAt.getFullYear();
  const customLabel = cycle.label.trim();

  if (customLabel && !/^ciclo\s+\d+$/i.test(customLabel) && customLabel.toLowerCase() !== "ciclo atual") {
    return customLabel;
  }

  return `${month} ${year}`;
}

function buildVirtualCycle(rankingCreatedAt: Date): RankingCycleSource {
  const currentMonth = new Date();
  return {
    id: getMonthKey(currentMonth),
    label: "Ciclo atual",
    startedAt: getMonthStart(currentMonth),
    endedAt: getMonthEnd(currentMonth)
  };
}

function buildCycleSummaries(
  rankingCreatedAt: Date,
  cycles: RankingCycleSource[],
  sourceEntries: RankingSourceEntry[]
): RankingCycleSummary[] {
  const currentMonthKey = getMonthKey(new Date());
  const normalizedCycles = cycles.length ? [...cycles] : [buildVirtualCycle(rankingCreatedAt)];

  if (!normalizedCycles.some((cycle) => getMonthKey(cycle.startedAt) === currentMonthKey)) {
    normalizedCycles.push(buildVirtualCycle(rankingCreatedAt));
  }

  const monthCycles = [...new Map(normalizedCycles.map((cycle) => [getMonthKey(cycle.startedAt), cycle] as const)).values()];

  return monthCycles.map((cycle) => {
    const entries = sourceEntries.filter((entry) => isEntryInCycle(entry, cycle));
    const tournamentCount = new Set(entries.map((entry) => entry.tournament.id)).size;

    return {
      id: getMonthKey(cycle.startedAt),
      label: buildCycleLabel(0, cycle),
      startedAt: getMonthStart(cycle.startedAt),
      endedAt: cycle.endedAt,
      isCurrent: getMonthKey(cycle.startedAt) === currentMonthKey,
      tournamentCount,
      entryCount: entries.length
    };
  });
}

function buildRankingView(
  ranking: {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
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
    cycles: RankingCycleSource[];
  },
  sourceEntries: RankingSourceEntry[],
  selectedCycleId?: string
): RankingProfileWithLeaderboard {
  const cycles = buildCycleSummaries(ranking.createdAt, ranking.cycles, sourceEntries);
  const cycleSource = ranking.cycles.length ? ranking.cycles : [buildVirtualCycle(ranking.createdAt)];
  const currentMonthKey = getMonthKey(new Date());
  const selectedCycle =
    (selectedCycleId ? cycleSource.find((cycle) => getMonthKey(cycle.startedAt) === selectedCycleId) : null) ??
    cycleSource.find((cycle) => getMonthKey(cycle.startedAt) === currentMonthKey) ??
    buildVirtualCycle(ranking.createdAt);
  const selectedEntries = sourceEntries.filter((entry) => isEntryInCycle(entry, selectedCycle));
  const leaderboard = buildRankingLeaderboard(selectedEntries);
  const tournaments = buildTournamentSummaries(selectedEntries);

  return {
    id: ranking.id,
    name: ranking.name,
    description: ranking.description,
    rules: ranking.rules,
    tournaments,
    cycles,
    selectedCycleId: getMonthKey(selectedCycle.startedAt),
    _count: ranking._count,
    leaderboard,
    linkedPlayers: leaderboard.length,
    linkedTournamentEntries: selectedEntries.length
  };
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

async function getRankingSourceEntriesByRankingIds(arenaId: string, rankingIds: string[]) {
  return prisma.tournamentPlayer.findMany({
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
}

export async function getRankingProfilesWithLeaderboard(arenaId: string): Promise<RankingProfileWithLeaderboard[]> {
  const rankings = await prisma.rankingProfile.findMany({
    where: { arenaId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      rules: {
        orderBy: [{ displayOrder: "asc" }]
      },
      cycles: {
        orderBy: [{ startedAt: "asc" }],
        select: {
          id: true,
          label: true,
          startedAt: true,
          endedAt: true
        }
      },
      tournaments: {
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
  const sourceEntries = await getRankingSourceEntriesByRankingIds(arenaId, rankingIds);

  const entriesByRankingId = new Map<string, RankingSourceEntry[]>();
  for (const entry of sourceEntries) {
    const current = entriesByRankingId.get(entry.tournament.rankingId ?? "") ?? [];
    current.push(entry);
    entriesByRankingId.set(entry.tournament.rankingId ?? "", current);
  }

  return rankings.map((ranking) =>
    buildRankingView(ranking, entriesByRankingId.get(ranking.id) ?? [])
  );
}

export async function getRankingProfileLeaderboard(arenaId: string, rankingId: string, selectedCycleId?: string) {
  const ranking = await prisma.rankingProfile.findFirst({
    where: {
      id: rankingId,
      arenaId
    },
    include: {
      rules: {
        orderBy: [{ displayOrder: "asc" }]
      },
      cycles: {
        orderBy: [{ startedAt: "asc" }],
        select: {
          id: true,
          label: true,
          startedAt: true,
          endedAt: true
        }
      },
      tournaments: {
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

  return buildRankingView(ranking, sourceEntries, selectedCycleId);
}
