import assert from "node:assert/strict";
import test from "node:test";
import { pixPaymentExpiration } from "../src/lib/payments/pix-expiration";
import {
  PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES,
  publicRegistrationPaymentExpiresAt,
  publicRegistrationPixExpiresAt,
} from "../src/lib/tournaments/registration-payment-hold";

test("vaga de inscrição expira em uma hora sem encurtar a validade mínima do Pix", () => {
  const createdAt = new Date("2035-01-02T12:00:00.000Z");
  const holdExpiresAt = publicRegistrationPaymentExpiresAt(createdAt);
  const pixExpiresAt = publicRegistrationPixExpiresAt(createdAt);
  assert.equal(PUBLIC_REGISTRATION_PAYMENT_HOLD_MINUTES, 60);
  assert.equal(holdExpiresAt.toISOString(), "2035-01-02T13:00:00.000Z");
  assert.equal(pixExpiresAt.toISOString(), "2035-01-02T13:35:00.000Z");
  assert.equal(pixPaymentExpiration(new Date("2035-01-02T12:59:59.000Z"), pixExpiresAt), pixExpiresAt);
});
