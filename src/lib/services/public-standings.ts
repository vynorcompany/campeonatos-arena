import { prisma } from "@/lib/prisma";
import {
  buildPublicGameAgenda,
  buildPublicCategoryStandings,
  selectPublicStandingsOptions,
  type PublicGameDay,
  type PublicStandingsOption,
} from "@/lib/public-standings";
import { getRankingProfileLeaderboard } from "@/lib/services/ranking";
import type { CompetitionFormat } from "@/lib/tournament-category/types";

export type ArenaPublicStandings = {
  arena: {
    name: string;
    logoUrl: string;
  };
  options: PublicStandingsOption[];
  selectedOptionId: string | null;
  upcomingGames: PublicGameDay[];
  selected:
    | {
        kind: "GENERAL_RANKING";
        rankingName: string;
        rows: Array<{
          position: number;
          playerName: string;
          points: number;
          tournamentsPlayed: number;
        }>;
      }
    | {
        kind: "CATEGORY";
        categoryName: string;
        eventName: string;
        format: CompetitionFormat;
        leagueStandings: ReturnType<
          typeof buildPublicCategoryStandings
        >["leagueStandings"];
        knockoutPlacement: ReturnType<
          typeof buildPublicCategoryStandings
        >["knockoutPlacement"];
      }
    | null;
};

export async function getArenaPublicStandings(
  arenaSlug: string,
  requestedOptionId?: string,
): Promise<ArenaPublicStandings | null> {
  const arena = await prisma.arena.findUnique({
    where: { slug: arenaSlug },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });
  if (!arena) {
    return null;
  }

  const [generalRanking, categoryRecords, agendaCategoryRecords] = await Promise.all([
    prisma.rankingProfile.findFirst({
      where: {
        arenaId: arena.id,
        active: true,
        isGeneral: true,
        type: "INDIVIDUAL",
      },
      select: {
        id: true,
        name: true,
        active: true,
        isGeneral: true,
        type: true,
      },
    }),
    prisma.categoryCompetition.findMany({
      where: {
        isPublic: true,
        status: "FINISHED",
        category: {
          tournament: { arenaId: arena.id },
        },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        format: true,
        status: true,
        isPublic: true,
        category: {
          select: {
            id: true,
            name: true,
            tournament: {
              select: { name: true },
            },
          },
        },
        pairs: {
          orderBy: { drawOrder: "asc" },
          select: {
            id: true,
            name: true,
          },
        },
        matches: {
          orderBy: { roundOrder: "asc" },
          select: {
            stage: true,
            homePairId: true,
            awayPairId: true,
            winnerPairId: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
    }),
    prisma.categoryCompetition.findMany({
      where: {
        isPublic: true,
        status: { not: "FINISHED" },
        category: {
          tournament: { arenaId: arena.id },
        },
        matches: {
          some: {
            scheduledDate: { not: null },
            scheduledTime: { not: null },
            winnerPairId: null,
          },
        },
      },
      select: {
        category: {
          select: {
            name: true,
            tournament: {
              select: { name: true },
            },
          },
        },
        matches: {
          where: {
            scheduledDate: { not: null },
            scheduledTime: { not: null },
            winnerPairId: null,
          },
          select: {
            label: true,
            stage: true,
            roundOrder: true,
            scheduledDate: true,
            scheduledTime: true,
            homePair: { select: { name: true } },
            awayPair: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  const upcomingGames = buildPublicGameAgenda(
    agendaCategoryRecords.flatMap((record) =>
      record.matches.map((match) => ({
        eventName: record.category.tournament.name,
        categoryName: record.category.name,
        label: match.label,
        stage: match.stage,
        roundOrder: match.roundOrder,
        scheduledDate: match.scheduledDate,
        scheduledTime: match.scheduledTime,
        homePairName: match.homePair?.name ?? "Dupla a definir",
        awayPairName: match.awayPair?.name ?? "Dupla a definir",
        finished: false,
      })),
    ),
  );
  const categorySources = categoryRecords.map((record) => ({
    id: record.category.id,
    name: record.category.name,
    eventName: record.category.tournament.name,
    isPublic: record.isPublic,
    status: record.status,
  }));
  const options = selectPublicStandingsOptions({
    generalRanking,
    categories: categorySources,
  });
  const selectedOption =
    options.find((option) => option.id === requestedOptionId) ?? options[0];

  if (!selectedOption) {
    return {
      arena,
      options,
      selectedOptionId: null,
      upcomingGames,
      selected: null,
    };
  }

  if (
    selectedOption.kind === "GENERAL_RANKING" &&
    generalRanking
  ) {
    const ranking = await getRankingProfileLeaderboard(
      arena.id,
      generalRanking.id,
    );

    return {
      arena,
      options,
      selectedOptionId: selectedOption.id,
      upcomingGames,
      selected: ranking
        ? {
            kind: "GENERAL_RANKING",
            rankingName: ranking.name,
            rows: ranking.leaderboard.map((row, index) => ({
              position: index + 1,
              playerName: row.playerName,
              points: row.points,
              tournamentsPlayed: row.tournamentsPlayed,
            })),
          }
        : null,
    };
  }

  const category = categoryRecords.find(
    (record) =>
      `category:${record.category.id}` === selectedOption.id,
  );
  if (!category) {
    return {
      arena,
      options,
      selectedOptionId: selectedOption.id,
      upcomingGames,
      selected: null,
    };
  }

  const standings = buildPublicCategoryStandings(category);

  return {
    arena,
    options,
    selectedOptionId: selectedOption.id,
    upcomingGames,
    selected: {
      kind: "CATEGORY",
      categoryName: category.category.name,
      eventName: category.category.tournament.name,
      format: category.format,
      ...standings,
    },
  };
}
