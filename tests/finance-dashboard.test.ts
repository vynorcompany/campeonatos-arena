import assert from "node:assert/strict";
import test from "node:test";

import { getReceivedRevenueCents } from "../src/lib/finance/dashboard";

const augustStart = new Date("2026-08-01T00:00:00.000Z");
const septemberStart = new Date("2026-09-01T00:00:00.000Z");

test("finance dashboard counts direct receipts and settlement receipts once", () => {
  assert.equal(
    getReceivedRevenueCents([
      { type: "REVENUE", status: "PAID", amountCents: 15000, paidAt: new Date("2026-08-03T12:00:00.000Z"), settlements: [] },
      { type: "REVENUE", status: "PENDING", amountCents: 31800, paidAt: null, settlements: [{ amountCents: 28500, paidAt: new Date("2026-08-05T12:00:00.000Z") }] },
      { type: "REVENUE", status: "PAID", amountCents: 10000, paidAt: new Date("2026-08-06T12:00:00.000Z"), settlements: [{ amountCents: 10000, paidAt: new Date("2026-08-06T12:00:00.000Z") }] },
      { type: "REVENUE", status: "VOIDED", amountCents: 5000, paidAt: new Date("2026-08-06T12:00:00.000Z"), settlements: [] },
      { type: "EXPENSE", status: "PAID", amountCents: 9000, paidAt: new Date("2026-08-07T12:00:00.000Z"), settlements: [] }
    ],
    augustStart,
    septemberStart
    ),
    53500
  );
});
