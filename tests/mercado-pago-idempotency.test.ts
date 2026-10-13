import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mercadoPagoIdempotencyKey } from "../src/lib/payments/mercado-pago-idempotency";

test("chaves de cobrança repetida são estáveis e aceitas pelo formato documentado", () => {
  for (const method of ["pix", "card", "boleto"] as const) {
    const key = mercadoPagoIdempotencyKey(method, "arena-a", "online_booking:reserva_com_sublinhado");
    assert.equal(key, mercadoPagoIdempotencyKey(method, "arena-a", "online_booking:reserva_com_sublinhado"));
    assert.match(key, /^[a-z0-9-]{1,128}$/);
    assert.ok(!key.includes("_"));
  }
});

test("arenas, cobranças e meios diferentes não compartilham chave", () => {
  const keys = new Set([
    mercadoPagoIdempotencyKey("pix", "arena-a", "entry-a"),
    mercadoPagoIdempotencyKey("pix", "arena-b", "entry-a"),
    mercadoPagoIdempotencyKey("pix", "arena-a", "entry-b"),
    mercadoPagoIdempotencyKey("card", "arena-a", "entry-a"),
    mercadoPagoIdempotencyKey("boleto", "arena-a", "entry-a"),
  ]);
  assert.equal(keys.size, 5);
});

test("Pix, cartão e boleto enviam a chave normalizada no cabeçalho do provedor", () => {
  const source = readFileSync(new URL("../src/lib/payments/mercado-pago.ts", import.meta.url), "utf8");
  for (const method of ["pix", "card", "boleto"]) {
    assert.match(source, new RegExp(`"X-Idempotency-Key": mercadoPagoIdempotencyKey\\("${method}", input\\.arenaId, input\\.externalReference\\)`));
  }
  assert.doesNotMatch(source, /"X-Idempotency-Key":\s*`[^`]*_/);
});
