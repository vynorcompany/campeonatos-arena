export type GeneralRankingFeedPairSource = {
  totalPoints: number;
  players: Array<{
    playerId: string;
    player: {
      name: string;
      active: boolean;
      photoUrl: string;
    };
  }>;
  competition: {
    status: string;
    application: { feedsGeneralRanking: boolean } | null;
    category: {
      tournament: {
        id: string;
        name: string;
        status: string;
        createdAt: Date;
      };
    };
  };
};

export type GeneralRankingSourceEntry = {
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

export function buildGeneralRankingSourceEntries(
  entries: GeneralRankingFeedPairSource[],
): GeneralRankingSourceEntry[] {
  return entries.flatMap((entry) => {
    if (
      entry.competition.status !== "FINISHED" ||
      !entry.competition.application?.feedsGeneralRanking ||
      !entry.totalPoints
    ) {
      return [];
    }

    return entry.players.map((player) => ({
      playerId: player.playerId,
      tournamentPoints: entry.totalPoints,
      tournament: entry.competition.category.tournament,
      player: player.player,
    }));
  });
}
