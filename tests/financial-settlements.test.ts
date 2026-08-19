import assert from "node:assert/strict";
import test from "node:test";

import {
  allocatePaymentsToDebts,
  getOutstandingCents
} from "../src/lib/finance/settlements";

test("financial settlement helpers retain the original receivable and calculate its balance", () => {
  assert.equal(getOutstandingCents(31800, [{ amountCents: 28500 }]), 3300);
  assert.equal(getOutstandingCents(31800, [{ amountCents: 40000 }]), 0);
});

test("financial settlement helpers allocate each payment to debts before the new sale", () => {
  const allocation = allocatePaymentsToDebts(
    [
      { financialEntryId: "debt-a", outstandingCents: 10000 },
      { financialEntryId: "debt-b", outstandingCents: 20000 }
    ],
    [
      { paymentMethod: "PIX", amountCents: 15000 },
      { paymentMethod: "Dinheiro", amountCents: 25000 }
    ]
  );

  assert.deepEqual(allocation.settlements, [
    { financialEntryId: "debt-a", paymentMethod: "PIX", amountCents: 10000 },
    { financialEntryId: "debt-b", paymentMethod: "PIX", amountCents: 5000 },
    { financialEntryId: "debt-b", paymentMethod: "Dinheiro", amountCents: 15000 }
  ]);
  assert.deepEqual(allocation.remainingPayments, [{ paymentMethod: "Dinheiro", amountCents: 10000 }]);
});
