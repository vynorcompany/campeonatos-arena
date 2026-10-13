import assert from "node:assert/strict";
import test from "node:test";
import { checkoutStatusLabel, isPendingCheckoutStatus } from "../src/lib/payments/checkout-status";

test("relatório inclui estados pendentes antigos do provedor sem contar recusados", () => {
  for (const status of ["PENDING", "pending", "in_process", "authorized"]) {
    assert.equal(isPendingCheckoutStatus(status), true);
    assert.equal(checkoutStatusLabel(status), "Pendente");
  }
  for (const status of ["PAID", "REVIEW", "rejected", "cancelled"]) {
    assert.equal(isPendingCheckoutStatus(status), false);
  }
  assert.equal(checkoutStatusLabel("rejected"), "Falhou");
  assert.equal(checkoutStatusLabel("REFUNDED"), "Estornado · nova tentativa liberada");
  assert.equal(checkoutStatusLabel("refunded"), "Estornado no provedor · conferir");
  assert.equal(checkoutStatusLabel("charged_back"), "Contestação · conferir");
});
