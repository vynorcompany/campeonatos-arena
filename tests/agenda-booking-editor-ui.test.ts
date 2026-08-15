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
});
