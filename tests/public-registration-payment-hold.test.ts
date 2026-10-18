import assert from "node:assert/strict";
import test from "node:test";
import { pixPaymentExpiration } from "../src/lib/payments/pix-expiration";
import {
  PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES,
  publicRegistrationApprovalAfterHold,
  publicRegistrationPaymentExpiresAt,
  publicRegistrationPixExpiresAt,
} from "../src/lib/tournaments/registration-payment-hold";

test("vaga e Pix expiram juntos em uma hora sem encurtar a validade mínima do Pix", () => {
  const createdAt = new Date("2035-01-02T12:00:00.000Z");
  const holdExpiresAt = publicRegistrationPaymentExpiresAt(createdAt);
  const pixExpiresAt = publicRegistrationPixExpiresAt(createdAt);
  assert.equal(PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES, 60);
  assert.equal(holdExpiresAt.toISOString(), "2035-01-02T13:00:00.000Z");
  assert.equal(pixExpiresAt.toISOString(), "2035-01-02T13:00:00.000Z");
  assert.equal(pixPaymentExpiration(new Date("2035-01-02T12:00:25.000Z"), pixExpiresAt), pixExpiresAt);
});

test("aprovação anterior ao prazo continua válida mesmo com callback atrasado", () => {
  const hold = new Date("2035-01-02T13:00:00.000Z");
  assert.equal(publicRegistrationApprovalAfterHold(hold, "2035-01-02T12:59:00Z", new Date("2035-01-02T14:00:00Z")), false);
  assert.equal(publicRegistrationApprovalAfterHold(hold, "2035-01-02T13:01:00Z"), true);
  assert.equal(publicRegistrationApprovalAfterHold(hold, null, new Date("2035-01-02T14:00:00Z")), true);
  assert.equal(publicRegistrationApprovalAfterHold(null, null), false);
});
