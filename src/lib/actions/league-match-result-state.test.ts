import assert from "node:assert/strict";
import test from "node:test";
import { leagueMatchResultErrorState } from "./league-match-result-state";

test("converts an expected League result error into form state", () => {
  assert.deepEqual(
    leagueMatchResultErrorState(new Error("Uma dupla deve vencer dois sets.")),
    { error: "Uma dupla deve vencer dois sets.", success: false },
  );
});

test("rethrows an unexpected error instead of exposing it to the form", () => {
  assert.throws(
    () => leagueMatchResultErrorState(new Error("database connection refused")),
    /database connection refused/,
  );
});
