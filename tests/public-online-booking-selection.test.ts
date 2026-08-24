import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("public booking highlights the consecutive slots for the authenticated client", () => {
  const form = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/reservar/[arenaSlug]/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(form, /slotMinutes/);
  assert.match(form, /public-booking-slot-block-selected/);
  assert.match(form, /currentClient/);
  assert.match(page, /getPublicPlayerAuth/);
  assert.match(page, /PublicClientAuthForm/);
  assert.match(actions, /requirePublicPlayerAuth/);
});

test("daily court grid uses compact rows and the public form remains responsive", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styles, /\.daily-court-grid th, \.daily-court-grid td \{[^}]*height: 25px;/);
  assert.match(styles, /\.public-booking-slot-block-selected/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*public-booking/);
});
