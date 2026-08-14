import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("arena persists daily schedule boundaries and slot interval", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert.match(schema, /scheduleStartMinute\s+Int\s+@default\(360\)/);
  assert.match(schema, /scheduleEndMinute\s+Int\s+@default\(1380\)/);
  assert.match(schema, /scheduleSlotMinutes\s+Int\s+@default\(30\)/);
});
