import assert from "node:assert/strict";
import test from "node:test";
import { reservationCourtIds } from "../src/lib/reports/reservation-court-filter";
import { reservationInsights } from "../src/lib/reports/reservation-insights";

test("court selection supports initial all, a single court and multiple courts", () => {
  const available = ["a", "b", "c"];
  assert.deepEqual(reservationCourtIds(undefined, available), available);
  assert.deepEqual(reservationCourtIds("b", available), ["b"]);
  assert.deepEqual(reservationCourtIds(["c", "a", "c"], available), ["a", "c"]);
});

test("empty or unknown selections never silently expand to all courts", () => {
  assert.deepEqual(reservationCourtIds(undefined, ["a", "b"], true), []);
  assert.deepEqual(reservationCourtIds("other-arena", ["a", "b"]), []);
  assert.deepEqual(reservationCourtIds(["a", "other-arena"], ["a", "b"]), ["a"]);
});

test("a reservation spanning two selected courts counts once and occupancy uses selected capacity", () => {
  const start = new Date("2026-10-05T00:00:00"), end = new Date("2026-10-05T23:59:59");
  const courts = ["a", "b", "c"].map(id => ({ id, name: id, weeklyRules: [{ weekday: 1, startsAtMinute: 480, endsAtMinute: 1080, available: true }] }));
  const occurrence = { id: "reservation", startsAt: new Date("2026-10-05T08:00:00"), endsAt: new Date("2026-10-05T09:00:00"), status: "SCHEDULED", sourceType: "MANUAL", bookingTypeName: "Reserva", occurrenceCourts: [{ courtId: "a" }, { courtId: "b" }] };
  const one = reservationInsights(courts.slice(0, 1), [occurrence], start, end);
  const several = reservationInsights(courts.slice(0, 2), [occurrence], start, end);
  assert.equal(one.activeReservations, 1);
  assert.equal(several.activeReservations, 1);
  assert.equal(one.occupancyPercent, 10);
  assert.equal(several.occupancyPercent, 10);
  assert.equal(one.courtInsights.length, 1);
  assert.equal(several.courtInsights.length, 2);
});
