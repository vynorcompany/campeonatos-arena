import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("agenda slot dialog offers booking details, participants and payment controls", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  assert.match(source, /saveCourtBookingAction/);
  assert.match(source, /Buscar cliente/);
  assert.match(source, /Forma de pagamento/);
  assert.match(source, /Horário/);
  assert.match(source, /VALOR DA QUADRA/);
  assert.match(source, /Dividir igualmente/);
  assert.match(source, /slot\.participants \?\? \[\]/);
  assert.doesNotMatch(source, /Math\.max\(0, 4/);
  assert.match(source, /às/);
  assert.match(source, /addPlayerToReservation/);
  assert.match(source, /Super 12/);
  assert.match(source, /agenda-participant-row/);
  assert.match(source, /CREDIT_CARD/);
  assert.match(source, /DEBIT_CARD/);
  assert.match(source, /CREDIT_BALANCE/);
  assert.match(source, /Professor responsável/);
  assert.match(source, /courtIds/);
  assert.match(source, /VALOR POR ATLETA/);
  assert.match(source, /Remover atleta/);
  assert.doesNotMatch(source, /aceita no máximo 24 atletas/);
});

test("agenda organiza a reserva em cards e mantém a busca de cliente discreta", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(source, /agenda-booking-summary-grid/);
  assert.match(source, /QUADRA/);
  assert.match(source, /TIPO DA RESERVA/);
  assert.match(source, /VALOR DA QUADRA/);
  assert.match(source, /DATA E HORÁRIO/);
  assert.match(source, /agenda-client-search/);
  assert.match(source, /Horário de início/);
  assert.match(source, /Horário de término/);
  assert.match(css, /\.agenda-booking-summary-grid \{[^}]*grid-template-columns: repeat\(4,/);
  assert.match(css, /\.agenda-client-search \{[^}]*max-width:/);
  assert.match(css, /\.agenda-booking-dialog \{[^}]*1240px/);
});
