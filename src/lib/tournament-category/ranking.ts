import type { CompetitionFormat } from "./types";

export type PlacementStage =
  | "CHAMPION"
  | "RUNNER_UP"
  | "SEMIFINAL"
  | "QUARTERFINAL"
  | "PARTICIPATION";

type PlacementMatch = {
  stage: string;
  homePairId: string | null;
  awayPairId: string | null;
  winnerPairId: string | null;
};

type BuildPlacementStagesInput = {
  format: CompetitionFormat;
  pairIds: string[];
  matches: PlacementMatch[];
  leagueOrder?: string[];
};

export type PlacementRuleMap = Record<PlacementStage, number>;

function getLoserPairId(match: PlacementMatch) {
  if (!match.homePairId || !match.awayPairId || !match.winnerPairId) {
    return null;
  }

  return match.winnerPairId === match.homePairId
    ? match.awayPairId
    : match.homePairId;
}

export function buildPlacementStages({
  format,
  pairIds,
  matches,
  leagueOrder = [],
}: BuildPlacementStagesInput) {
  const stages = new Map(
    pairIds.map((pairId) => [pairId, "PARTICIPATION" as PlacementStage]),
  );

  if (format === "LEAGUE") {
    if (leagueOrder.length !== pairIds.length) {
      throw new Error("A classificação da Liga precisa incluir todas as duplas.");
    }

    if (leagueOrder[0]) {
      stages.set(leagueOrder[0], "CHAMPION");
    }
    if (leagueOrder[1]) {
      stages.set(leagueOrder[1], "RUNNER_UP");
    }
    return stages;
  }

  for (const match of matches) {
    const loserPairId = getLoserPairId(match);

    if (match.stage === "QUARTERFINAL" && loserPairId) {
      stages.set(loserPairId, "QUARTERFINAL");
    }
    if (match.stage === "SEMIFINAL" && loserPairId) {
      stages.set(loserPairId, "SEMIFINAL");
    }
    if (match.stage === "FINAL") {
      if (!match.winnerPairId || !loserPairId) {
        throw new Error("A final precisa estar concluída antes do encerramento.");
      }
      stages.set(match.winnerPairId, "CHAMPION");
      stages.set(loserPairId, "RUNNER_UP");
    }
  }

  if (![...stages.values()].includes("CHAMPION")) {
    throw new Error("A final precisa estar concluída antes do encerramento.");
  }

  return stages;
}

export function buildPlacementAwards(
  stages: Map<string, PlacementStage>,
  rules: PlacementRuleMap,
) {
  return new Map(
    [...stages].map(([pairId, stage]) => [pairId, rules[stage]]),
  );
}
