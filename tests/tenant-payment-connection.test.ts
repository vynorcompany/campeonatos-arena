import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Mercado Pago charges use the encrypted connection of the owning arena", () => {
  const payments = read("src/lib/payments/mercado-pago.ts");
  const registration = read("src/lib/actions/public-registration.ts");

  assert.match(payments, /mercadoPagoAccessTokenForArena/);
  assert.match(payments, /decryptConnectionSecrets\(connection\.encryptedSecrets\)/);
  assert.match(payments, /arenaId_provider: \{ arenaId, provider: "MERCADO_PAGO" \}/);
  assert.doesNotMatch(payments, /env\.mercadoPagoAccessToken/);
  assert.match(registration, /arenaId: result\.arenaId/);
});

test("Mercado Pago webhooks resolve the arena before querying the provider", () => {
  const webhook = read("src/app/api/payments/mercado-pago/webhook/route.ts");

  assert.match(webhook, /where: \{ mercadoPagoPaymentId: paymentId \}/);
  assert.match(webhook, /getMercadoPagoPayment\(registration\.tournament\.arenaId, paymentId\)/);
  assert.match(webhook, /withArenaTransaction\(registration\.tournament\.arenaId/);
});
