import assert from "node:assert/strict";
import test from "node:test";
import { applyComandaPaymentPolicy } from "../src/lib/comandas/operational-policy";
const base = { totalCents: 3000, creditCents: 0, payments: [{ paymentMethod: "PIX", amountCents: 3000 }], preventOverpayment: true, requireFullPayment: false, allowPartial: false, playerId: "client" };
test("closing policy preserves every cent across mixed payments and surplus credit", () => {
  const result = applyComandaPaymentPolicy({ ...base, preventOverpayment: false, creditCents: 500, payments: [{ paymentMethod: "PIX", amountCents: 2000 }, { paymentMethod: "Dinheiro", amountCents: 2000 }] });
  assert.equal(result.excessCents, 1500); assert.equal(result.outstandingCents, 0);
  assert.deepEqual(result.appliedPayments, [{ paymentMethod: "PIX", amountCents: 2000 }, { paymentMethod: "Dinheiro", amountCents: 500 }]);
  assert.deepEqual(result.excessPayments, [{ paymentMethod: "Dinheiro", amountCents: 1500 }]);
  assert.equal(result.appliedPayments.reduce((sum, payment) => sum + payment.amountCents, 0) + result.excessCents, 4000);
});
test("overpayment includes wallet credit and requires an identified credit owner", () => {
  assert.throws(() => applyComandaPaymentPolicy({ ...base, creditCents: 1 }), /ultrapassar/);
  assert.throws(() => applyComandaPaymentPolicy({ ...base, preventOverpayment: false, playerId: null, creditCents: 500 }), /Vincule um cliente/);
});
test("full payment default requires explicit staff override for a remaining debt", () => {
  const input = { ...base, requireFullPayment: true, payments: [{ paymentMethod: "PIX", amountCents: 1000 }] };
  assert.throws(() => applyComandaPaymentPolicy(input), /quitação integral/);
  const overridden = applyComandaPaymentPolicy({ ...input, allowPartial: true });
  assert.equal(overridden.outstandingCents, 2000); assert.equal(overridden.partialOverride, true);
  assert.equal(applyComandaPaymentPolicy({ ...input, requireFullPayment: false }).partialOverride, false);
});
test("invalid integers and monetary overflow never reach ledger allocation", () => {
  for (const amount of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => applyComandaPaymentPolicy({ ...base, payments: [{ paymentMethod: "PIX", amountCents: amount }] }), /inválidos/);
  assert.throws(() => applyComandaPaymentPolicy({ ...base, totalCents: Number.MAX_SAFE_INTEGER, payments: [{ paymentMethod: "PIX", amountCents: Number.MAX_SAFE_INTEGER }, { paymentMethod: "Dinheiro", amountCents: 1 }] }), /inválidos/);
});
