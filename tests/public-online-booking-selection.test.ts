import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("public booking highlights the consecutive slots for the authenticated client", () => {
  const form = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/components/public-booking-content.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(form, /slotMinutes/);
  assert.match(form, /public-booking-slot-block-selected/);
  assert.match(form, /currentClient/);
  assert.match(form, /Valor total/);
  assert.match(form, /selectedTotalCents/);
  assert.match(form, /public-booking-court-card/);
  assert.doesNotMatch(form, /Quadra<select/);
  assert.match(page, /getPublicPlayerAuth/);
  assert.match(page, /PublicClientAuthForm/);
  assert.match(actions, /requirePublicPlayerAuth/);
});

test("daily court grid uses compact rows and the public form remains responsive", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styleRules("daily-court-grid", {"context":"th"}), /height: 25px;/);
  assert.ok(utilityClasses("public-booking-slot-block-selected").length, "public-booking-slot-block-selected has component Tailwind utilities");
  assert.match(styleRules("public-booking-duration-field"), /align-content: start/);
  assert.ok(utilityClasses("public-booking-court-card").length, "public-booking-court-card has component Tailwind utilities");
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*public-booking/);
});
