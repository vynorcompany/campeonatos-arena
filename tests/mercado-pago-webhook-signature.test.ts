import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { verifyMercadoPagoWebhookSignature } from "../src/lib/payments/mercado-pago-webhook-signature";

test("accepts a Mercado Pago webhook signature with the expected manifest", () => {
  const secret = "test-webhook-secret";
  const signature = createHmac("sha256", secret).update("id:12345;request-id:req-1;ts:1700000000;").digest("hex");
  assert.equal(verifyMercadoPagoWebhookSignature({ secret, signatureHeader: `ts=1700000000,v1=${signature}`, requestId: "req-1", dataId: "12345" }), true);
});

test("rejects a missing or mismatched Mercado Pago webhook signature", () => {
  assert.equal(verifyMercadoPagoWebhookSignature({ secret: "secret", signatureHeader: null, requestId: "req-1", dataId: "12345" }), false);
  assert.equal(verifyMercadoPagoWebhookSignature({ secret: "secret", signatureHeader: "ts=1,v1=deadbeef", requestId: "req-1", dataId: "12345" }), false);
});
