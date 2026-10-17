import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { activeCourtOccurrenceWhere, onlineBookingHoldCutoff, onlineBookingPixExpiration, ONLINE_BOOKING_PAYMENT_HOLD_MINUTES } from "../src/lib/calendar/online-booking-hold";
import { pixPaymentExpiration } from "../src/lib/payments/pix-expiration";

test("reserva pendente bloqueia por 15 minutos e expira depois", () => {
  const now = new Date("2026-10-12T15:00:00.000Z");
  assert.equal(ONLINE_BOOKING_PAYMENT_HOLD_MINUTES, 15);
  assert.equal(onlineBookingHoldCutoff(now).toISOString(), "2026-10-12T14:45:00.000Z");
  const filter = activeCourtOccurrenceWhere(now);
  assert.equal(filter.OR[1].status, "PENDING_PAYMENT");
  assert.deepEqual(filter.OR[1].createdAt, { gt: new Date("2026-10-12T14:45:00.000Z") });
  assert.deepEqual(filter.OR[0], { status: { notIn: ["CANCELED", "CANCELLED", "PENDING_PAYMENT"] } });
});

test("tentativas de Pix da mesma reserva usam vencimento estável e válido até o fim do hold", () => {
  const createdAt = new Date("2026-10-12T15:00:00.000Z");
  const requestedExpiration = onlineBookingPixExpiration(createdAt);
  assert.equal(requestedExpiration.toISOString(), "2026-10-12T16:00:00.000Z");
  for (const retryAt of ["2026-10-12T15:01:00.000Z", "2026-10-12T15:14:59.000Z"]) {
    assert.equal(pixPaymentExpiration(new Date(retryAt), requestedExpiration), requestedExpiration);
  }
  const action = readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8");
  assert.match(action, /createPixPayment\(\{ \.\.\.paymentInput, expiresAt: onlineBookingPixExpiration\(booking\.createdAt\) \}\)/);
});
