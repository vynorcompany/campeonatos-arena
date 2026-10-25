import assert from "node:assert/strict";
import test from "node:test";
import { portalCheckoutPolicy, portalExcludedPaymentTypes } from "../src/lib/payments/portal-checkout-policy";
const initial = { portalPaymentsConfigured: false, portalPaymentEnabled: false, portalPixEnabled: true, portalCreditCardEnabled: false, checkoutExpiryMinutes: 0 };
test("configurar impressora não desativa pagamentos existentes nem seus meios", () => {
  assert.deepEqual(portalCheckoutPolicy(initial), portalCheckoutPolicy(null));
  assert.equal(portalCheckoutPolicy(initial).enabled, true);
  assert.equal(portalCheckoutPolicy(initial).creditCard, true);
  assert.equal(portalCheckoutPolicy({ ...initial, portalPaymentsConfigured: true }).enabled, false);
});
test("nenhum meio configurado não cria checkout; carteira não é falsamente excluída", () => {
  assert.throws(() => portalExcludedPaymentTypes({ pix: false, creditCard: false }), /Selecione/);
  for (const methods of [{ pix: true, creditCard: false }, { pix: false, creditCard: true }, { pix: true, creditCard: true }]) {
    const ids = portalExcludedPaymentTypes(methods).map(value => value.id);
    assert.equal(ids.includes("bank_transfer"), !methods.pix);
    assert.equal(ids.includes("credit_card"), !methods.creditCard);
    assert.equal(ids.includes("account_money"), false);
  }
});
