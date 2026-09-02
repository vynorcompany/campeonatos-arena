import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("commands centers the date picker and keeps search in the right toolbar", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /commands-toolbar-right/);
  assert.match(css, /\.commands-date-trigger \{[^}]*grid-column: 2/);
  assert.match(css, /\.commands-toolbar-right \{[^}]*grid-column: 3/);
  assert.match(css, /\.content-shell:has\(\.commands-page\)/);
  assert.match(css, /\.commands-list-items \{[^}]*grid-template-columns/);
  assert.match(css, /\.command-card \{[^}]*min-height/);
  assert.match(page, /CommandCard/);
  assert.match(card, /Finalizar comanda/);
  assert.match(card, /Inserir produtos/);
  assert.match(card, /Total atual/);
  assert.match(card, /command-item-controls/);
});

test("commands use an operational day panel with a clear empty state", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const picker = readFileSync(resolve(process.cwd(), "src/components/comandas/commands-date-picker.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /commands-day-panel/);
  assert.match(page, /commands-empty-illustration/);
  assert.match(page, /commands-empty-action/);
  assert.match(picker, /commands-date-icon/);
  assert.match(css, /\.commands-day-panel/);
  assert.match(css, /\.commands-empty-illustration/);
  assert.match(css, /\.commands-empty-action/);
});
