import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("cancelamento da agenda exige escolha explícita e preserva cobranças quitadas", () => {
  const dialog = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(dialog, /Cancelar reserva e cobranças/);
  assert.match(dialog, /Manter cobranças em aberto/);
  assert.match(dialog, /Cancelar cobranças em aberto/);
  assert.match(dialog, /formData\.set\("cancelOpenCharges", cancelOpenCharges \? "yes" : "no"\)/);
  assert.doesNotMatch(dialog, /window\.confirm/);
  assert.match(actions, /cancelOpenCharges: z\.enum\(\["yes", "no"\]\)/);
  assert.match(actions, /source: "SCHEDULE_BOOKING", externalReference: \{ in: occurrenceIds \}, status: "PENDING"/);
  assert.match(actions, /settlements: \{ none: \{ amountCents: \{ gt: 0 \} \} \}/);
  assert.match(actions, /status: "VOIDED", voidedAt: new Date\(\)/);
  assert.match(actions, /refreshFinanceRoutes\(\)/);
});
