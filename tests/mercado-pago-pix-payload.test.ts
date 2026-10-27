import * as providerDeadline from "../src/lib/http/fetch-with-deadline";
import { portalExcludedPaymentTypes } from "../src/lib/payments/portal-checkout-policy";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { mercadoPagoIdempotencyKey } from "../src/lib/payments/mercado-pago-idempotency";
import { pixPaymentExpiration } from "../src/lib/payments/pix-expiration";

type PaymentInput = { paymentTypes?: { pix: boolean; creditCard: boolean }; arenaId: string; amountCents: number; description: string; payerEmail: string; externalReference: string; expiresAt?: Date; validFrom?: Date; returnUrl?: string };

function loadPaymentRequests(requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }>) {
  const source = readFileSync(new URL("../src/lib/payments/mercado-pago.ts", import.meta.url), "utf8");
  const exports: Record<string, (input: PaymentInput) => Promise<{ expiresAt: Date | null }>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, URL, AbortSignal,
    fetch: async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      requests.push({ headers: init.headers, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ id: "payment-synthetic", init_point: "https://example.test/card", point_of_interaction: { transaction_data: { ticket_url: "https://example.test/pix" } } }) };
    },
    require: (name: string) => {
      if (name === "@/lib/http/fetch-with-deadline") return providerDeadline;
      if (name === "@/lib/payments/portal-checkout-policy") return { portalExcludedPaymentTypes };
      if (name === "@/lib/env") return { env: {} };
      if (name === "@/lib/payments/connection-secrets") return { decryptConnectionSecrets: () => ({ accessToken: "synthetic-token" }) };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_arenaId: string, operation: (tx: unknown) => Promise<unknown>) => operation({ paymentConnection: { findUnique: async () => ({ status: "CONNECTED", encryptedSecrets: "synthetic" }) } }) };
      if (name === "@/lib/payments/boleto-cancellation") return {};
      if (name === "@/lib/payments/pix-expiration") return { pixPaymentExpiration };
      if (name === "@/lib/payments/mercado-pago-idempotency") return { mercadoPagoIdempotencyKey };
      if (name === "@/lib/payments/boleto-payer") return {};
      throw new Error(`Import inesperado: ${name}`);
    },
  });
  return exports;
}

test("Pix financeiro repetido mantém a mesma requisição sem vencimento variável", async () => {
  const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const createPix = loadPaymentRequests(requests).createPixPayment;
  const input = { arenaId: "arena-a", amountCents: 5000, description: "Mensalidade", payerEmail: "atleta@example.test", externalReference: "entry-a" };
  await createPix(input);
  await createPix(input);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers["X-Idempotency-Key"], requests[1].headers["X-Idempotency-Key"]);
  assert.deepEqual(requests[0].body, requests[1].body);
  assert.equal("date_of_expiration" in requests[0].body, false);
});

test("Pix de inscrição usa o vencimento fixo solicitado", async () => {
  const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const createPix = loadPaymentRequests(requests).createPixPayment;
  const expiresAt = new Date(Date.now() + 95 * 60_000);
  await createPix({ arenaId: "arena-a", amountCents: 5000, description: "Inscrição", payerEmail: "atleta@example.test", externalReference: "registration-a", expiresAt });
  assert.equal(requests[0].body.date_of_expiration, expiresAt.toISOString());
});

test("checkout de cartão para inscrição tem vigência fixa e retorna o mesmo prazo", async () => {
  const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const createCard = loadPaymentRequests(requests).createCardCheckout;
  const validFrom = new Date("2035-01-02T12:00:00.000Z");
  const expiresAt = new Date("2035-01-02T13:00:00.000Z");
  const result = await createCard({ arenaId: "arena-a", amountCents: 5000, description: "Inscrição", payerEmail: "atleta@example.test", externalReference: "registration-a", validFrom, expiresAt });
  assert.equal(requests[0].body.expires, true);
  assert.equal(requests[0].body.expiration_date_from, validFrom.toISOString());
  assert.equal(requests[0].body.expiration_date_to, expiresAt.toISOString());
  assert.equal(result.expiresAt, expiresAt);
});

test("Checkout do Portal envia Pix, crédito e vencimento como configurados", async () => {
  const requests: Array<{ headers: Record<string, string>; body: Record<string, unknown> }> = [];
  const action = loadPaymentRequests(requests).createHostedCheckout;
  const validFrom = new Date("2026-10-25T15:00:00Z"); const expiresAt = new Date("2026-10-25T15:15:00Z");
  const input = { arenaId: "arena-a", amountCents: 5000, description: "Conta", payerEmail: "qa@example.test", externalReference: "checkout-a" };
  await action({ ...input, validFrom, expiresAt, paymentTypes: { pix: true, creditCard: false } });
  assert.equal(requests[0].body.expires, true); assert.equal(requests[0].body.expiration_date_to, expiresAt.toISOString());
  assert.deepEqual((requests[0].body.payment_methods as any).excluded_payment_types.map((type: any) => type.id), ["ticket", "atm", "debit_card", "prepaid_card", "credit_card"]);
  await action({ ...input, paymentTypes: { pix: false, creditCard: true } });
  assert.deepEqual((requests[1].body.payment_methods as any).excluded_payment_types.map((type: any) => type.id), ["ticket", "atm", "debit_card", "prepaid_card", "bank_transfer"]);
  assert.equal("expiration_date_to" in requests[1].body, false);
});
