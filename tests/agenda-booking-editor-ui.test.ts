import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("agenda slot dialog offers booking details, participants and payment controls", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  assert.match(source, /saveCourtBookingAction/);
  assert.match(source, /Adicionar atleta/);
  assert.match(source, /Forma de pagamento/);
  assert.match(source, /Horário/);
  assert.match(source, /Valor da quadra/);
  assert.match(source, /Dividir igualmente/);
  assert.match(source, /Math\.max\(0, 4/);
  assert.match(source, /às/);
  assert.match(source, /setParticipants\(\(current\) => \[\.\.\.current/);
  assert.match(source, /Super 12/);
  assert.match(source, /agenda-super12-participants/);
  assert.match(source, /CREDIT_CARD/);
  assert.match(source, /DEBIT_CARD/);
  assert.match(source, /CREDIT_BALANCE/);
  assert.match(source, /Professor responsável/);
  assert.match(source, /courtIds/);
  assert.match(source, /Valor por atleta/);
  assert.match(source, /super12PaymentPlayerId/);
  assert.match(source, /Pagamento do atleta/);
  assert.match(source, /agenda-payment-indicator/);
  assert.doesNotMatch(source, /aceita no máximo 24 atletas/);
});
