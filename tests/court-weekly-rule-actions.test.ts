import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("weekly-rule actions validate conflicts and scope mutations to the arena", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  assert.match(actions, /export async function createCourtWeeklyRuleAction/);
  assert.match(actions, /weeklyRangesOverlap/);
  assert.match(actions, /where: \{ id: parsed\.data\.courtId, arenaId: auth\.arenaId \}/);
  assert.match(actions, /export async function deleteCourtWeeklyRuleAction/);
  assert.match(actions, /court: \{ arenaId: auth\.arenaId \}/);
});
