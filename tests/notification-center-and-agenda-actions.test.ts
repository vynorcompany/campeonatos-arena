import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("notification center keeps individual notifications until the user reads them", () => {
  const bell = readFileSync(resolve(process.cwd(), "src/components/layout/arena-notification-bell.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/notifications.ts"), "utf8");

  assert.match(actions, /markArenaNotificationReadAction/);
  assert.match(actions, /markAllArenaNotificationsReadAction/);
  assert.match(bell, /markArenaNotificationReadAction/);
  assert.match(bell, /Marcar todas como lidas/);
  assert.doesNotMatch(bell, /markArenaNotificationsReadAction\(\)/);
});

test("occupied agenda slots separate destructive actions and keep command access in reservation details", () => {
  const dialog = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(dialog, /agenda-open-comandas-button/);
  assert.match(dialog, /agenda-slot-option-cancel/);
  assert.match(dialog, /agenda-slot-option-free/);
  assert.ok(utilityClasses("agenda-slot-option-cancel").length, "agenda-slot-option-cancel has component Tailwind utilities");
  assert.ok(utilityClasses("agenda-slot-option-free").length, "agenda-slot-option-free has component Tailwind utilities");
  assert.ok(utilityClasses("agenda-slot-confirmation-indicator").length, "agenda-slot-confirmation-indicator has component Tailwind utilities");
});

test("notification panel is anchored to the viewport instead of overflowing the sidebar", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styleRules("sidebar", {"context":".arena-notification-panel"}), / position: fixed/);
  assert.match(styles, /width: min\(360px, calc\(100vw - 32px\)\)/);
});
