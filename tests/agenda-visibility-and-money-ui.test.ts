import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("agenda starts with no placeholder athletes and keeps the court price at the top", () => {
  const dialog = source("src/components/agenda-slot-dialog.tsx");

  assert.match(dialog, /useState<Participant\[\]>\(\(\) => slot\.participants \?\? \[\]\)/);
  assert.match(dialog, /agenda-court-price-summary/);
  assert.match(dialog, /Adicionar atleta/);
});

test("agenda makes the complete slot clickable and exposes individual commandas", () => {
  const dialog = source("src/components/agenda-slot-dialog.tsx");
  const css = source("src/app/globals.css");

  assert.match(dialog, /openComandasForParticipants/);
  assert.match(dialog, /Abrir comandas dos atletas/);
  assert.match(css, /\.agenda-slot-entry \{[^}]*min-height: 100%/);
  assert.match(css, /\.agenda-booking-dialog \{[^}]*width: min\(100%, 1100px\)/);
});

test("money fields use the shared intelligent monetary editor", () => {
  const dialog = source("src/components/agenda-slot-dialog.tsx");
  const ledger = source("src/components/finance/accounts-ledger.tsx");
  const moneyInput = source("src/components/forms/money-input.tsx");

  assert.match(dialog, /MoneyInput/);
  assert.match(ledger, /MoneyInput/);
  assert.match(moneyInput, /event\.currentTarget\.select\(\)/);
  assert.match(moneyInput, /formatMoneyInput/);
});

test("global scale restores readable base text while the agenda keeps compact open slots", () => {
  const css = source("src/app/globals.css");

  assert.match(css, /:root \{\s*font-size: 100%/);
  assert.match(css, /\.daily-court-available[^}]*padding: 1px 6px/);
  assert.match(css, /\.daily-court-event[^}]*min-height: 42px/);
});
