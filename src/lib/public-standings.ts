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
};

export type PublicStandingsOption = {
  id: string;
  kind: "GENERAL_RANKING" | "CATEGORY";
  label: string;
};

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
      label: `Ranking Geral · ${generalRanking.name}`,
    });
  }

  options.push(
    ...categories
      .filter(
        (category) =>
          category.isPublic && category.status === "FINISHED",
      )
      .map((category) => ({
        id: `category:${category.id}`,
        kind: "CATEGORY" as const,
        label: `${category.name} · ${category.eventName}`,
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
