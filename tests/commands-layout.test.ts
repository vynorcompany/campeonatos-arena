import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("commands keeps date, search and actions in a wrapping toolbar", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /commands-toolbar-right/);
  assert.match(styleRules("commands-date-trigger"), /grid-column: auto/);
  assert.match(styleRules("commands-toolbar-right"), /flex-wrap: wrap/);
  assert.ok(utilityClasses("content-shell").length, "content-shell has component Tailwind utilities");
  assert.match(styleRules("commands-list-items"), /grid-template-columns/);
  assert.match(styleRules("command-card"), /min-height/);
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
  assert.ok(utilityClasses("commands-day-panel").length, "commands-day-panel has component Tailwind utilities");
  assert.ok(utilityClasses("commands-empty-illustration").length, "commands-empty-illustration has component Tailwind utilities");
  assert.ok(utilityClasses("commands-empty-action").length, "commands-empty-action has component Tailwind utilities");
});

test("commands use compact controls and vector icons in the daily workspace", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const picker = readFileSync(resolve(process.cwd(), "src/components/comandas/commands-date-picker.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /commands-icon/);
  assert.match(page, /M8 14h\.01M12 14h\.01M16 14h\.01/);
  assert.match(picker, /commands-icon/);
  assert.doesNotMatch(styleRules("commands-day-panel"), /min-height: (620|500)px/);
  assert.match(styleRules("commands-actions", {"context":".button"}), /min-height: 46px/);
  assert.match(picker, /<svg (?:className="commands-icon"|className=\{(?:cx\()?viewStyles\.commands_icon(?:\))?\})/);
  assert.match(styleRules("commands-date-trigger", {"context":".commands-date-icon"}), /color: #fff/);
  assert.match(page, /stroke="currentColor"/);
});

test("new client commands open in a floating picker and submit on selection", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const modal = readFileSync(resolve(process.cwd(), "src/components/comandas/new-command-modal.tsx"), "utf8");

  assert.match(page, /NewCommandModal/);
  assert.match(modal, /commands-new-modal/);
  assert.match(modal, /onChange/);
  assert.match(modal, /router\.push\(closeHref\)/);
});
