import assert from "node:assert/strict";
import test from "node:test";
import { pixPaymentExpiration } from "../src/lib/payments/pix-expiration";

test("Pix emitido perto do fim do bloqueio mantém o prazo mínimo do provedor", () => {
  const now = new Date("2026-10-13T10:14:00.000Z");
  const oldBookingExpiration = new Date("2026-10-13T10:30:00.000Z");
  assert.equal(pixPaymentExpiration(now, oldBookingExpiration).toISOString(), "2026-10-13T10:45:00.000Z");
  assert.equal(pixPaymentExpiration(now).toISOString(), "2026-10-13T10:45:00.000Z");
});

test("Pix com vencimento futuro maior preserva o prazo solicitado", () => {
  const now = new Date("2026-10-13T10:00:00.000Z");
  const requested = new Date("2026-10-14T10:00:00.000Z");
  assert.equal(pixPaymentExpiration(now, requested), requested);
});
