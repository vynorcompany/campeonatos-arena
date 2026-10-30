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

test("allocation preserves each receiving account when a payment spans debt and sale", () => {
  const allocation = allocatePaymentsToDebts([{ financialEntryId: "debt", outstandingCents: 1200 }], [{ bankAccountId: "bank-a", paymentMethod: "PIX", amountCents: 1000 }, { bankAccountId: "bank-b", paymentMethod: "Cartão", amountCents: 1200 }]);
  assert.deepEqual(allocation.settlements.map(row => [row.bankAccountId, row.amountCents]), [["bank-a", 1000], ["bank-b", 200]]);
  assert.deepEqual(allocation.remainingPayments, [{ bankAccountId: "bank-b", paymentMethod: "Cartão", amountCents: 1000 }]);
});
