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
  assert.match(dialog, /Livrar horário/);
  assert.match(dialog, /Abrir comandas/);
  assert.match(dialog, /cancelCourtBookingAction/);
  assert.match(dialog, /openBookingComandasAction/);
  assert.match(calendarActions, /export async function cancelCourtBookingAction/);
  assert.match(comandaActions, /export async function openBookingComandasAction/);
});

test("online booking lists only starts that fit every configured duration", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/reservar/[arenaSlug]/page.tsx"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /durations\.length === court\.onlineDurationMinutes\.length/);
  assert.match(form, /Você está usando sua conta de cliente/);
  assert.doesNotMatch(form, /Telefone final:/);
  assert.match(styles, /\.public-booking-shell \{ width: min\(100%, 1020px\)/);
});
