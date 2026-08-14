import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("schema scopes weekly price periods to each court", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert.match(schema, /weeklyRules\s+CourtWeeklyRule\[\]/);
  assert.match(schema, /model CourtWeeklyRule/);
  assert.match(schema, /weekday\s+Int/);
  assert.match(schema, /priceCents\s+Int\s+@default\(0\)/);
  assert.match(schema, /@@index\(\[courtId, weekday\]\)/);
});
