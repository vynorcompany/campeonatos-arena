import assert from "node:assert/strict";
import test from "node:test";
import { activeCourtOccurrenceWhere, onlineBookingHoldCutoff, ONLINE_BOOKING_PAYMENT_HOLD_MINUTES } from "../src/lib/calendar/online-booking-hold";

test("reserva pendente bloqueia por 15 minutos e expira depois", () => {
  const now = new Date("2026-10-12T15:00:00.000Z");
  assert.equal(ONLINE_BOOKING_PAYMENT_HOLD_MINUTES, 15);
  assert.equal(onlineBookingHoldCutoff(now).toISOString(), "2026-10-12T14:45:00.000Z");
  const filter = activeCourtOccurrenceWhere(now);
  assert.equal(filter.OR[1].status, "PENDING_PAYMENT");
  assert.deepEqual(filter.OR[1].createdAt, { gt: new Date("2026-10-12T14:45:00.000Z") });
  assert.deepEqual(filter.OR[0], { status: { notIn: ["CANCELED", "CANCELLED", "PENDING_PAYMENT"] } });
});
