import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("occupied agenda slots expose cancellation and command operations", () => {
  const dialog = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const calendarActions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const comandaActions = readFileSync(resolve(process.cwd(), "src/lib/actions/comanda.ts"), "utf8");

  assert.match(dialog, /agenda-slot-options-trigger/);
  assert.match(dialog, /Cancelar horário/);
  assert.match(dialog, /Liberar horário/);
  assert.match(dialog, /Abrir comandas/);
  assert.match(dialog, /cancelCourtBookingAction/);
  assert.match(dialog, /openBookingComandasAction/);
  assert.match(calendarActions, /export async function cancelCourtBookingAction/);
  assert.match(comandaActions, /export async function openBookingComandasAction/);
});

test("online booking lists starts that fit the minimum duration and flags a conflicting extension", () => {
  const page = readFileSync(resolve(process.cwd(), "src/components/public-booking-content.tsx"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /minimumDuration/);
  assert.match(page, /minimumBlocked/);
  assert.match(page, /blockedMinutes/);
  assert.match(form, /public-booking-slot-block-conflict/);
  assert.match(form, /Você está usando sua conta de cliente/);
  assert.doesNotMatch(form, /Telefone final:/);
  assert.match(styles, /\.public-booking-shell \{ width: min\(100%, 1020px\)/);
});
