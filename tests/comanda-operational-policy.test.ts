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
test("explicit cash change does not become credit or inflate receipts even when mixed with PIX", () => {
 const result=applyComandaPaymentPolicy({...base,excessDisposition:"CHANGE",playerId:null,totalCents:350,payments:[{paymentMethod:"Dinheiro",amountCents:4000},{paymentMethod:"PIX",amountCents:100}]});
 assert.equal(result.changeCents,3750);assert.equal(result.excessCents,0);assert.equal(result.excessPayments.length,0);
 assert.deepEqual(result.appliedPayments,[{paymentMethod:"Dinheiro",amountCents:250},{paymentMethod:"PIX",amountCents:100}]);
 assert.throws(()=>applyComandaPaymentPolicy({...base,totalCents:350,excessDisposition:"CHANGE",payments:[{paymentMethod:"PIX",amountCents:4000}]}),/dinheiro/);
});
test("explicit surplus credit requires a customer and conserves bank destinations",()=>{
 const input={...base,totalCents:350,excessDisposition:"CREDIT" as const,payments:[{paymentMethod:"PIX",bankAccountId:"bank-a",amountCents:4000}]};
 const result=applyComandaPaymentPolicy(input);assert.equal(result.excessCents,3650);assert.equal(result.changeCents,0);assert.equal(result.excessPayments[0].bankAccountId,"bank-a");
 assert.throws(()=>applyComandaPaymentPolicy({...input,playerId:null}),/Vincule/);
});
