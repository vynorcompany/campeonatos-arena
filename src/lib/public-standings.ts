import { buildPlacementStages } from "@/lib/tournament-category/ranking";
import { rankStandings } from "@/lib/tournament-category/standings";
import type {
  CompetitionFormat,
  StandingMatch,
} from "@/lib/tournament-category/types";

export type PublicStandingsGeneralRankingSource = {
  id: string;
  name: string;
  active: boolean;
  isGeneral: boolean;
  type: "INDIVIDUAL" | "PAIR";
};

export type PublicStandingsCategorySource = {
  id: string;
  name: string;
  eventName: string;
  isPublic: boolean;
  status: string;
  format: CompetitionFormat;
};

export type PublicStandingsOption = {
  id: string;
  kind: "GENERAL_RANKING" | "CATEGORY";
  label: string;
};

export type PublicGameSource = {
  categoryId?: string;
  eventName: string;
  categoryName: string;
  label: string;
  stage: string;
  roundOrder: number;
  scheduledDate: string | null;
  scheduledTime: string | null;
  homePairName: string;
  awayPairName: string;
  status?: PublicGameStatus;
  finished?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  homeSet1?: number | null;
  awaySet1?: number | null;
  homeSet2?: number | null;
  awaySet2?: number | null;
  homeSet3?: number | null;
  awaySet3?: number | null;
};

export type PublicGameStatus = "SCHEDULED" | "LIVE" | "FINISHED";

export type PublicGameDay = {
  date: string;
  label: string;
  games: Array<{
    eventName: string;
    categoryName: string;
    label: string;
    stage: string;
    roundOrder: number;
    scheduledTime: string | null;
    status: PublicGameStatus;
    homePairName: string;
    awayPairName: string;
    finalScore?: {
      homeScore: number;
      awayScore: number;
    };
    setScores?: Array<{
      homeScore: number;
      awayScore: number;
    }>;
  }>;
};

function formatPublicGameDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const dateAtNoon = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(dateAtNoon);
}

export function buildPublicGameAgenda(
  matches: PublicGameSource[],
): PublicGameDay[] {
  const visibleMatches = [...matches].sort((first, second) => {
      const byDate = (first.scheduledDate ?? "9999-12-31").localeCompare(
        second.scheduledDate ?? "9999-12-31",
      );
      if (byDate) return byDate;

      const byTime = (first.scheduledTime ?? "23:59").localeCompare(
        second.scheduledTime ?? "23:59",
      );
      if (byTime) return byTime;

      const byEvent = first.eventName.localeCompare(second.eventName, "pt-BR");
      if (byEvent) return byEvent;

      const byCategory = first.categoryName.localeCompare(
        second.categoryName,
        "pt-BR",
      );
      if (byCategory) return byCategory;

      return first.roundOrder - second.roundOrder;
    });

  return visibleMatches.reduce<PublicGameDay[]>((days, match) => {
    const date = match.scheduledDate ?? "unscheduled";
    const day = days.at(-1);
    const status = match.status ?? (match.finished ? "FINISHED" : "SCHEDULED");
    const finalScore =
      status === "FINISHED" &&
      match.homeScore != null &&
      match.awayScore != null
        ? { homeScore: match.homeScore, awayScore: match.awayScore }
        : undefined;
    const setScores = finalScore
      ? [
          [match.homeSet1, match.awaySet1],
          [match.homeSet2, match.awaySet2],
          [match.homeSet3, match.awaySet3],
        ].flatMap(([homeScore, awayScore]) =>
          homeScore != null && awayScore != null
            ? [{ homeScore, awayScore }]
            : [],
        )
      : undefined;
    const game = {
      eventName: match.eventName,
      categoryName: match.categoryName,
      label: match.label,
      stage: match.stage,
      roundOrder: match.roundOrder,
      scheduledTime: match.scheduledTime,
      status,
      homePairName: match.homePairName,
      awayPairName: match.awayPairName,
      ...(finalScore ? { finalScore } : {}),
      ...(setScores?.length ? { setScores } : {}),
    };

    if (day?.date === date) {
      day.games.push(game);
      return days;
    }

    days.push({
      date,
      label: match.scheduledDate ? formatPublicGameDay(date) : "A definir",
      games: [game],
    });
    return days;
  }, []);
}

export function filterPublicGames(
  games: PublicGameSource[],
  filters: {
    categoryId: string | null;
    status: PublicGameStatus | "ALL";
  },
) {
  return games.filter(
    (game) =>
      (!filters.categoryId || game.categoryId === filters.categoryId) &&
      (filters.status === "ALL" ||
        (game.status ?? (game.finished ? "FINISHED" : "SCHEDULED")) ===
          filters.status),
  );
}

export function selectPublicStandingsOptions({
  generalRanking,
  categories,
}: {
  generalRanking: PublicStandingsGeneralRankingSource | null;
  categories: PublicStandingsCategorySource[];
}): PublicStandingsOption[] {
  const options: PublicStandingsOption[] = [];

  if (
    generalRanking?.active &&
    generalRanking.isGeneral &&
    generalRanking.type === "INDIVIDUAL"
  ) {
    options.push({
      id: `ranking:${generalRanking.id}`,
      kind: "GENERAL_RANKING",
      label: "Ranking Geral",
    });
  }

  options.push(
    ...categories
      .filter(
        (category) =>
          category.isPublic &&
          (category.status === "FINISHED" ||
            (category.status === "PUBLISHED" && category.format === "LEAGUE")),
      )
      .map((category) => ({
        id: `category:${category.id}`,
        kind: "CATEGORY" as const,
        label: category.name,
      })),
  );

  return options;
}

export type PublicCategoryStandingsSource = {
  format: CompetitionFormat;
  pairs: Array<{
    id: string;
    name: string;
  }>;
  matches: Array<{
    stage: string;
    homePairId: string | null;
    awayPairId: string | null;
    winnerPairId: string | null;
    homeScore: number | null;
    awayScore: number | null;
  }>;
};

type PublicCategoryMatch = PublicCategoryStandingsSource["matches"][number];

type CompletedPublicCategoryMatch = PublicCategoryMatch & {
  homePairId: string;
  awayPairId: string;
  winnerPairId: string;
  homeScore: number;
  awayScore: number;
};

function isCompletedMatch(
  match: PublicCategoryMatch,
): match is CompletedPublicCategoryMatch & StandingMatch {
  return Boolean(
    match.homePairId &&
      match.awayPairId &&
      match.winnerPairId &&
      match.homeScore != null &&
      match.awayScore != null,
  );
}

function buildLeagueStandings(category: PublicCategoryStandingsSource) {
  const completedMatches = category.matches.filter(isCompletedMatch);

  return rankStandings(
    category.pairs.map((pair) => {
      const matches = completedMatches.filter(
        (match) =>
          match.homePairId === pair.id || match.awayPairId === pair.id,
      );
      return {
        pairId: pair.id,
        victories: matches.filter(
          (match) => match.winnerPairId === pair.id,
        ).length,
        differential: matches.reduce(
          (total, match) =>
            total +
            (match.homePairId === pair.id
              ? match.homeScore - match.awayScore
              : match.awayScore - match.homeScore),
          0,
        ),
      };
    }),
    completedMatches,
  ).map((standing, index) => {
    const matches = completedMatches.filter(
      (match) =>
        match.homePairId === standing.pairId ||
        match.awayPairId === standing.pairId,
    ).length;

    return {
      position: index + 1,
      pairName:
        category.pairs.find((pair) => pair.id === standing.pairId)?.name ??
        "Dupla removida",
      matches,
      victories: standing.victories,
      losses: matches - standing.victories,
      differential: standing.differential,
    };
  });
}

function buildKnockoutPlacement(category: PublicCategoryStandingsSource) {
  const final = category.matches.find(
    (match) => match.stage === "FINAL" && match.winnerPairId,
  );
  if (!final) {
    return [];
  }

  return [...buildPlacementStages({
    format: category.format,
    pairIds: category.pairs.map((pair) => pair.id),
    matches: category.matches,
  })]
    .filter(([, stage]) => stage === "CHAMPION" || stage === "RUNNER_UP")
    .sort(([, first], [, second]) =>
      first === "CHAMPION" ? -1 : second === "CHAMPION" ? 1 : 0,
    )
    .map(([pairId], index) => ({
      position: index + 1,
      pairName:
        category.pairs.find((pair) => pair.id === pairId)?.name ??
        "Dupla removida",
    }));
}

export function buildPublicCategoryStandings(
  category: PublicCategoryStandingsSource,
) {
  return {
    leagueStandings:
      category.format === "LEAGUE" ? buildLeagueStandings(category) : [],
    knockoutPlacement:
      category.format === "LEAGUE"
        ? []
        : buildKnockoutPlacement(category),
  };
}
