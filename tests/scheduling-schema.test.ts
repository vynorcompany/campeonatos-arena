import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

test("schema defines courts and court-scoped schedule occurrences", () => {
  assert.match(schema, /model Court \{/);
  assert.match(schema, /model ScheduleOccurrence \{/);
  assert.match(schema, /courts\s+Court\[\]/);
  assert.match(schema, /occurrenceCourts\s+ScheduleOccurrenceCourt\[\]/);
  assert.match(schema, /@@unique\(\[occurrenceId, courtId\]\)/);
});
