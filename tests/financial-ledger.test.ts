import assert from "node:assert/strict";
import test from "node:test";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";

test("keeps the original account value and adds interest when calculating a partial settlement balance", () => {
  const balance = getFinancialEntryBalance(31800, [
    { amountCents: 28500, interestCents: 1000 }
  ]);

  assert.deepEqual(balance, {
    originalCents: 31800,
    interestCents: 1000,
    paidCents: 28500,
    outstandingCents: 4300,
    settled: false
  });
});

test("treats legacy paid entries without settlements as fully settled", () => {
  const balance = getFinancialEntryBalance(12500, [], "PAID");

  assert.equal(balance.paidCents, 12500);
  assert.equal(balance.outstandingCents, 0);
  assert.equal(balance.settled, true);
});
