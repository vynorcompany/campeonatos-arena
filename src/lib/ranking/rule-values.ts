import { getRankingRuleBlueprint } from "@/lib/validators/ranking";

export type RankingRuleValues = {
  model: "LEAGUE" | "KNOCKOUT";
  championPoints?: number;
  runnerUpPoints?: number;
  thirdPoints?: number;
  semifinalPoints?: number;
  quarterfinalPoints?: number;
  participationPoints?: number;
};

export function buildRankingRuleValues(values: RankingRuleValues) {
  return getRankingRuleBlueprint(values.model).map((rule) => {
    const points = values[rule.field];
    if (points === undefined) throw new Error(`Pontuação ausente para ${rule.label}.`);
    return {
      stageKey: rule.stageKey,
      label: rule.label,
      displayOrder: rule.displayOrder,
      points,
    };
  });
}
