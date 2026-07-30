import type {
  CompetitionFormat,
  DrawGroup,
  KnockoutMatch,
  RoundRobinMatch,
} from "./types";

type BuildGroupsInput = {
  format: CompetitionFormat;
  pairIds: string[];
};

const minimumKnockoutPairs = 8;
const maximumSimplePairs = 16;

function requireKnockoutPairMinimum(format: CompetitionFormat, pairIds: string[]) {
  if (format !== "LEAGUE" && pairIds.length < minimumKnockoutPairs) {
    throw new Error("Non-league formats require at least eight pairs.");
  }
}

function buildBalancedGroups(pairIds: string[], count: number): DrawGroup[] {
  const baseSize = Math.floor(pairIds.length / count);
  const largerGroupCount = pairIds.length % count;
  let nextPairIndex = 0;

  return Array.from({ length: count }, (_, index) => {
    const size = baseSize + (index < largerGroupCount ? 1 : 0);
    const group = {
      name: `Grupo ${index + 1}`,
      pairIds: pairIds.slice(nextPairIndex, nextPairIndex + size),
    };
    nextPairIndex += size;
    return group;
  });
}

export function buildGroups({ format, pairIds }: BuildGroupsInput): DrawGroup[] {
  if (format === "LEAGUE") {
    return [{ name: "Liga", pairIds: [...pairIds] }];
  }

  requireKnockoutPairMinimum(format, pairIds);

  if (format === "SIMPLE" && pairIds.length > maximumSimplePairs) {
    throw new Error("Simple format supports at most sixteen pairs.");
  }

  if (format === "THREE_GROUPS") {
    return buildBalancedGroups(pairIds, 3);
  }

  if (format === "FOUR_GROUPS") {
    return buildBalancedGroups(pairIds, 4);
  }

  const groupCount = Math.ceil(pairIds.length / 4);
  return buildBalancedGroups(pairIds, groupCount);
}

export function buildRoundRobin(pairIds: string[]): RoundRobinMatch[] {
  const matches: RoundRobinMatch[] = [];

  for (let homeIndex = 0; homeIndex < pairIds.length - 1; homeIndex += 1) {
    for (let awayIndex = homeIndex + 1; awayIndex < pairIds.length; awayIndex += 1) {
      matches.push({
        homePairId: pairIds[homeIndex],
        awayPairId: pairIds[awayIndex],
      });
    }
  }

  return matches;
}

export function buildKnockout(
  format: CompetitionFormat,
  pairIds: string[],
): KnockoutMatch[] {
  if (format === "LEAGUE") {
    return [];
  }

  if (pairIds.length !== minimumKnockoutPairs) {
    throw new Error("Knockout brackets require exactly eight qualified pairs.");
  }

  return [
    ...Array.from({ length: 4 }, (_, index) => ({
      stage: "QUARTERFINAL" as const,
      roundOrder: index + 1,
      homePairId: pairIds[index * 2],
      awayPairId: pairIds[index * 2 + 1],
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      stage: "SEMIFINAL" as const,
      roundOrder: index + 5,
      homePairId: null,
      awayPairId: null,
    })),
    {
      stage: "FINAL" as const,
      roundOrder: 7,
      homePairId: null,
      awayPairId: null,
    },
  ];
}
