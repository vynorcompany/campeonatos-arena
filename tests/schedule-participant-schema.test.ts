import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("schedule participants link players and receivable entries", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert.match(schema, /model ScheduleParticipant/);
  assert.match(schema, /financialEntryId\s+String\?/);
  assert.match(schema, /@@unique\(\[occurrenceId, playerId\]\)/);
});
