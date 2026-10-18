import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("a página de pagamento limita o resumo ao atleta da arena e à reserva ainda válida", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/reservar/[arenaSlug]/pagamento/[occurrenceId]/page.tsx"), "utf8");
  assert.match(page, /getPublicPlayerAuth\(params\.arenaSlug\)/);
  assert.match(page, /auth\?\.arenaId === arena\.id/);
  assert.match(page, /participants: \{ some: \{ playerId: auth\.playerId \} \}/);
  assert.match(page, /participants: \{ where: \{ playerId: auth\.playerId \}/);
  assert.match(page, /createdAt: \{ gt: onlineBookingHoldCutoff\(\) \}/);
  assert.match(page, /holdExpiresAt=\{holdExpiresAt\}/);
  assert.match(page, /Reserva indisponível/);
  const choice = readFileSync(resolve(process.cwd(), "src/components/public-booking-payment-choice.tsx"), "utf8");
  assert.match(choice, /Tempo restante para pagar:/);
  assert.match(choice, /current >= deadline && !refreshedAtExpiry\.current/);
  assert.match(choice, /router\.refresh\(\)/);
  assert.match(choice, /!expired \? <div className=\{viewStyles\.public_booking_payment_options\}>/);
});
