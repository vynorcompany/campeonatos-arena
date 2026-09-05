import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildCourtBookingAvailability, endMinutesForBookingStart } from "../src/lib/calendar/booking-availability";

const rules = [
  { weekday: 1, startsAtMinute: 540, endsAtMinute: 660, available: true },
];

test("available booking times skip occupied and unavailable court intervals", () => {
  const availability = buildCourtBookingAvailability({
    weekday: 1,
    slotMinutes: 30,
    rules,
    occupiedIntervals: [{ startsAtMinute: 600, endsAtMinute: 630 }],
  });

  assert.deepEqual(availability, [540, 570, 630]);
});

test("booking end options stop at the first unavailable interval", () => {
  assert.deepEqual(endMinutesForBookingStart({ startMinute: 540, slotMinutes: 30, availableMinutes: [540, 570, 630] }), [570, 600]);
});

test("duration options include only uninterrupted available slots after the chosen start", () => {
  const source = readFileSync(resolve(process.cwd(), "src/lib/calendar/booking-availability.ts"), "utf8");

  assert.match(source, /export function durationMinutesForBookingStart/);
});
