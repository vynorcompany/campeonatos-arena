import test from "node:test";
import assert from "node:assert/strict";
import { createRankingProfileSchema } from "@/lib/validators/ranking";

test("aceita alimentacao do Geral somente para ranking de duplas", () => {
  assert.equal(
    createRankingProfileSchema.safeParse({
      name: "Liga A",
      type: "PAIR",
      model: "LEAGUE",
      feedsGeneralRanking: true,
      championPoints: 10,
      runnerUpPoints: 8,
      thirdPoints: 6,
      participationPoints: 2,
    }).success,
    true,
  );

  assert.equal(
    createRankingProfileSchema.safeParse({
      name: "Geral",
      type: "INDIVIDUAL",
      model: "KNOCKOUT",
      feedsGeneralRanking: true,
      championPoints: 10,
      runnerUpPoints: 8,
      semifinalPoints: 6,
      quarterfinalPoints: 4,
      participationPoints: 2,
    }).success,
    false,
  );
});
