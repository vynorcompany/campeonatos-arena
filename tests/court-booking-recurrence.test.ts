import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("fixed court bookings belong to a series that can be released for one date or canceled from that date onward", () => {
  const schema = source("prisma/schema.prisma");
  const actions = source("src/lib/actions/calendar.ts");

  assert.match(schema, /model ScheduleBookingSeries \{/);
  assert.match(schema, /bookingSeriesId\s+String\?/);
  assert.match(actions, /mode === "FREE"/);
  assert.match(actions, /bookingSeriesId/);
  assert.match(actions, /isFixedBooking/);
});
