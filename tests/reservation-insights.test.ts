import assert from "node:assert/strict";
import test from "node:test";
import { reservationInsights, reservationServiceLabel } from "../src/lib/reports/reservation-insights";

const rangeStart = new Date("2026-09-14T00:00:00");
const rangeEnd = new Date("2026-09-14T23:59:59");
const courts = [
  { id: "court-a", name: "Quadra A", weeklyRules: [{ weekday: 1, startsAtMinute: 8 * 60, endsAtMinute: 18 * 60, available: true }] },
  { id: "court-b", name: "Quadra B", weeklyRules: [{ weekday: 1, startsAtMinute: 8 * 60, endsAtMinute: 18 * 60, available: true }] }
];

test("calculates court occupancy without cancelled reservations", () => {
  const insights = reservationInsights(courts, [
    { id: "1", startsAt: new Date("2026-09-14T08:00:00"), endsAt: new Date("2026-09-14T10:00:00"), status: "SCHEDULED", sourceType: "ONLINE_BOOKING", bookingTypeName: "Reserva", occurrenceCourts: [{ courtId: "court-a" }] },
    { id: "2", startsAt: new Date("2026-09-14T10:00:00"), endsAt: new Date("2026-09-14T12:00:00"), status: "CANCELED", sourceType: "MANUAL", bookingTypeName: "Reserva", occurrenceCourts: [{ courtId: "court-b" }] }
  ], rangeStart, rangeEnd);

  assert.equal(insights.activeReservations, 1);
  assert.equal(insights.cancelledReservations, 1);
  assert.equal(insights.highestVolumeCourt?.courtName, "Quadra A");
  assert.equal(insights.highestVolumeCourt?.occupancyPercent, 20);
  assert.equal(insights.occupancyPercent, 10);
  assert.equal(insights.mostUsedService?.label, "Reserva online");
});

test("uses recognizable labels for reservation sources", () => {
  assert.equal(reservationServiceLabel({ sourceType: "SUPER12", bookingTypeName: "Reserva" }), "Super 12");
  assert.equal(reservationServiceLabel({ sourceType: "LEAGUE_PROPOSAL", bookingTypeName: "Reserva" }), "Liga");
  assert.equal(reservationServiceLabel({ sourceType: "MANUAL", bookingTypeName: "Reserva fixa" }), "Reserva fixa");
});
