import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("agenda starts with no placeholder athletes and keeps the court price in the summary", () => {
  const dialog = source("src/components/agenda-slot-dialog.tsx");
  const css = source("src/app/globals.css");

  assert.match(dialog, /useState<Participant\[\]>\(\(\) => slot\.participants \?\? \[\]\)/);
  assert.match(dialog, /agenda-booking-summary-grid/);
  assert.match(css, /\.agenda-booking-summary-grid \{[^}]*repeat\(4/);
  assert.match(dialog, /Buscar cliente/);
  assert.doesNotMatch(dialog, /Valor com forma de pagamento entra como quitado/);
});

test("agenda makes the complete slot clickable and exposes individual commandas", () => {
  const dialog = source("src/components/agenda-slot-dialog.tsx");
  const css = source("src/app/globals.css");

  assert.match(dialog, /openComandasForParticipants/);
  assert.match(dialog, /Abrir comandas dos atletas/);
  assert.match(css, /\.agenda-slot-entry \{[^}]*min-height: 100%/);
  assert.match(css, /\.agenda-booking-dialog \{[^}]*width: min\(100%, 1100px\)/);
});

test("agenda booking identifies reservation types, suggests athletes and closes slot options outside", () => {
  const dialog = source("src/components/agenda-slot-dialog.tsx");
  const page = source("src/app/(app)/agenda/page.tsx");
  const css = source("src/app/globals.css");

  assert.match(page, /bookingTypeIcon/);
  assert.match(page, /agenda-booking-type-icon/);
  assert.match(dialog, /event\.target as HTMLElement/);
  assert.match(dialog, /agenda-slot-options/);
  assert.match(dialog, /agenda-player-suggestions/);
  assert.match(dialog, /addPlayerToReservation/);
  assert.match(css, /agenda-slot-options-trigger[^}]*border-radius: 5px/);
  assert.match(css, /button-primary:not\(\.agenda-add-athlete\)/);
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
  const page = source("src/app/(app)/agenda/page.tsx");
  assert.doesNotMatch(page, /<strong>\{priceLabel\(rule\.priceCents\)\}<\/strong>/);
  assert.match(css, /\.button-primary[^}]*background:.*(?:#|var\(--success\))/);
});
