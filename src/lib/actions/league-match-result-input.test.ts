import assert from "node:assert/strict";
import test from "node:test";
import { parseLeagueMatchResultInput } from "./league-match-result-input";

test("returns inline feedback when the first League set is tied", () => {
  const formData = new FormData();
  formData.set("matchId", "match-1");
  formData.set("homeSet1", "6");
  formData.set("awaySet1", "6");
  formData.set("homeSet2", "6");
  formData.set("awaySet2", "4");

  assert.deepEqual(parseLeagueMatchResultInput(formData), {
    error: "Informe os dois primeiros sets sem empate.",
    success: false,
  });
});
