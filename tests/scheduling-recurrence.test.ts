import assert from "node:assert/strict";
import test from "node:test";
import { expandWeeklyOccurrences } from "@/lib/scheduling/recurrence";

const at = (value: string) => new Date(`${value}:00.000Z`);

test("expands a weekly series through its inclusive end date", () => {
  assert.deepEqual(
    expandWeeklyOccurrences({
      startsAt: at("2026-08-20T18:00"),
      endsAt: at("2026-08-20T19:00"),
      until: at("2026-09-03T23:59")
    }).map((occurrence) => occurrence.startsAt.toISOString()),
    ["2026-08-20T18:00:00.000Z", "2026-08-27T18:00:00.000Z", "2026-09-03T18:00:00.000Z"]
  );
});

test("preserves the duration on every generated occurrence", () => {
  assert.deepEqual(
    expandWeeklyOccurrences({
      startsAt: at("2026-08-20T18:00"),
      endsAt: at("2026-08-20T19:30"),
      until: at("2026-08-27T23:59")
    }).map((occurrence) => occurrence.endsAt.toISOString()),
    ["2026-08-20T19:30:00.000Z", "2026-08-27T19:30:00.000Z"]
  );
});
