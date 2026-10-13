import assert from "node:assert/strict";
import test from "node:test";
import { cashReferenceDate, cashReferencePeriod, formatCashReferenceDate, parseCashAmountCents } from "../src/lib/finance/cash-day";

test("daily cash follows the arena's Brazilian calendar, not the server's UTC date", () => {
  assert.equal(cashReferenceDate(new Date("2026-09-23T02:30:00.000Z")).toISOString(), "2026-09-22T00:00:00.000Z");
  assert.equal(cashReferenceDate(new Date("2026-09-23T03:00:00.000Z")).toISOString(), "2026-09-23T00:00:00.000Z");
});

test("cash report filters and labels use the same arena calendar day", () => {
  const period = cashReferencePeriod(new Date("2026-10-12T03:00:00.000Z"), new Date("2026-10-13T02:59:59.999Z"));
  assert.equal(period.gte.toISOString(), "2026-10-12T00:00:00.000Z");
  assert.equal(period.lte.toISOString(), "2026-10-12T00:00:00.000Z");
  assert.equal(formatCashReferenceDate(period.gte), "12/10/2026");
});

test("cash amounts accept Brazilian currency and reject malformed or overflowing values", () => {
  assert.equal(parseCashAmountCents("0,00"), 0);
  assert.equal(parseCashAmountCents("R$ 1.234,56"), 123456);
  assert.equal(parseCashAmountCents("100"), 10000);
  for (const value of ["1.2.3", "1,234", "-1,00", "1e6", "21.474.836,48"]) {
    assert.throws(() => parseCashAmountCents(value), /valor monetário válido/i);
  }
});
