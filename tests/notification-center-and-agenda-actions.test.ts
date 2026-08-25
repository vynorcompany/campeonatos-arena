import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.match(styles, /\.agenda-slot-option-cancel/);
  assert.match(styles, /\.agenda-slot-option-free/);
  assert.match(styles, /\.agenda-slot-confirmation-indicator/);
});

test("notification panel is anchored to the viewport instead of overflowing the sidebar", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styles, /\.sidebar \.arena-notification-panel \{ position: fixed/);
  assert.match(styles, /width: min\(360px, calc\(100vw - 32px\)\)/);
});
