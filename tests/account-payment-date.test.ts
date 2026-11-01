import assert from "node:assert/strict";
import test from "node:test";
import { accountLastPaymentDate } from "../src/lib/finance/account-payment-date";

test("payment date preserves the arena day for legacy receipts after midnight UTC", () => {
  assert.equal(accountLastPaymentDate({ paidAt: new Date("2026-11-01T01:30:00Z"), settlements: [] }), "2026-10-31");
});

test("partial payments display the latest actual settlement regardless of query order", () => {
  assert.equal(accountLastPaymentDate({ paidAt: null, settlements: [{ paidAt: new Date("2026-11-03T15:00:00Z") }, { paidAt: new Date("2026-10-31T15:00:00Z") }] }), "2026-11-03");
  assert.equal(accountLastPaymentDate({ paidAt: null, settlements: [] }), null);
});
