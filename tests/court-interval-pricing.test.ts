import assert from "node:assert/strict";
import test from "node:test";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";

test("court booking price sums the configured value of every selected interval", () => {
  const total = calculateCourtIntervalPrice({
    startsAtMinute: 18 * 60,
    durationMinutes: 90,
    intervalMinutes: 30,
    weekday: 1,
    rules: [
      { weekday: 1, startsAtMinute: 17 * 60, endsAtMinute: 19 * 60, priceCents: 9000 },
      { weekday: 1, startsAtMinute: 19 * 60, endsAtMinute: 22 * 60, priceCents: 12000 }
    ]
  });

  assert.equal(total, 30000);
});
