import assert from "node:assert/strict";
import test from "node:test";
import { verifyApprovedMercadoPagoPayment } from "../src/lib/payments/verified-payment";

const payment = { status: "approved", currency_id: "BRL", transaction_amount: 49.9, external_reference: "checkout-a" };

test("pagamento aprovado só concilia moeda, referência e valor exatos", () => {
  assert.deepEqual(verifyApprovedMercadoPagoPayment(payment, 4990, ["checkout-a"]), { ok: true, amountCents: 4990 });
  assert.equal(verifyApprovedMercadoPagoPayment({ ...payment, transaction_amount: 1 }, 4990, ["checkout-a"]).ok, false);
  assert.equal(verifyApprovedMercadoPagoPayment({ ...payment, currency_id: "USD" }, 4990, ["checkout-a"]).ok, false);
  assert.equal(verifyApprovedMercadoPagoPayment({ ...payment, external_reference: "checkout-b" }, 4990, ["checkout-a"]).ok, false);
  assert.equal(verifyApprovedMercadoPagoPayment({ ...payment, transaction_amount: Number.NaN }, 4990, ["checkout-a"]).ok, false);
});
