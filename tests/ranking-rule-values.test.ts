import assert from "node:assert/strict";
import test from "node:test";
import { buildRankingRuleValues } from "@/lib/ranking/rule-values";

test("ranking rule values follow each model's stages and preserve zero points", () => {
  const league = buildRankingRuleValues({ model: "LEAGUE", championPoints: 3, runnerUpPoints: 2, thirdPoints: 1, participationPoints: 0 });
  assert.deepEqual(league.map((rule) => [rule.stageKey, rule.points]), [
    ["CHAMPION", 3], ["RUNNER_UP", 2], ["THIRD", 1], ["PARTICIPATION", 0],
  ]);

  const knockout = buildRankingRuleValues({ model: "KNOCKOUT", championPoints: 8, runnerUpPoints: 4, semifinalPoints: 2, quarterfinalPoints: 1, participationPoints: 0 });
  assert.deepEqual(knockout.map((rule) => rule.stageKey), ["CHAMPION", "RUNNER_UP", "SEMIFINAL", "QUARTERFINAL", "PARTICIPATION"]);
});

test("ranking rule values reject a missing stage score", () => {
  assert.throws(() => buildRankingRuleValues({ model: "LEAGUE", championPoints: 3 }), /Pontuação ausente/);
});
