import assert from "node:assert/strict";
import test from "node:test";
import { leagueMatchResultErrorState } from "./league-match-result-state";

test("converts a League validation error into form state", () => {
  assert.deepEqual(
    leagueMatchResultErrorState(new Error("Informe os dois primeiros sets sem empate.")),
    { error: "Informe os dois primeiros sets sem empate.", success: false },
  );
});
