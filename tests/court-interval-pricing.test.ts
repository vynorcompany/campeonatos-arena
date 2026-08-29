import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";

test("court booking price sums the configured value of every selected interval", () => {
  const total = calculateCourtIntervalPrice({
    startsAtMinute: 18 * 60,
    durationMinutes: 90,
    intervalMinutes: 30,
    weekday: 1,
    rules: [
      { weekday: 1, startsAtMinute: 17 * 60, endsAtMinute: 19 * 60, priceCents: 9000 },
      { weekday: 1, startsAtMinute: 19 * 60, endsAtMinute: 22 * 60, priceCents: 12000 }
    ]
  });

  assert.equal(total, 30000);
});

test("existing court intervals expose an edit action for their configured value", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(page, /Editar/);
  assert.match(page, /updateCourtWeeklyRuleAction/);
  assert.match(actions, /export async function updateCourtWeeklyRuleAction/);
});

test("court interval controls close after editing and can copy to all weekly periods", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/forms/safe-action-form.tsx"), "utf8");

  assert.match(page, /closeClosestDetailsOnSuccess/);
  assert.match(page, /Todos os períodos/);
  assert.match(actions, /targetWeekday: z\.union/);
  assert.match(form, /closeClosestDetailsOnSuccess/);
});
