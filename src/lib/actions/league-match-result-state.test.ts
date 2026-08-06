import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("returns the League schema message as form state at the action boundary", async () => {
  const source = await readFile(new URL("./category-competition.ts", import.meta.url), "utf8");
  const actionSource = source.slice(
    source.indexOf("export async function recordCategoryLeagueMatchResultAction"),
    source.indexOf("export async function updateCategoryMatchStatusAction"),
  );

  assert.match(
    actionSource,
    /if \(!parsed\.success\) \{\s*return \{ error: invalidInputMessage\(parsed\.error\), success: false \};\s*\}/,
  );
});
