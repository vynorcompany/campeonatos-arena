import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { resolvePublicBookingSelection } from "@/lib/calendar/public-booking-selection";

test("public booking keeps the selected duration and exposes only the conflicting extension", () => {
  const selection = resolvePublicBookingSelection({
    startsAtMinute: 17 * 60,
    durationMinutes: 120,
    slotMinutes: 30,
    availableMinutes: [17 * 60, 17 * 60 + 30, 18 * 60, 18 * 60 + 30],
    blockedMinutes: [18 * 60 + 30]
  });

  assert.deepEqual(selection.selectedMinutes, [17 * 60, 17 * 60 + 30, 18 * 60]);
  assert.deepEqual(selection.conflictingMinutes, [18 * 60 + 30]);
  assert.equal(selection.hasConflict, true);
});

test("agenda keeps online settings on the daily grade and provides a compact month calendar", () => {
  const dashboard = readFileSync(resolve(process.cwd(), "src/app/(app)/painel/page.tsx"), "utf8");
  const comparison = readFileSync(resolve(process.cwd(), "src/components/dashboard-comparison-filter.tsx"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");
  const configuration = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(dashboard, /DashboardComparisonFilter/);
  assert.match(comparison, /Comparar com/);
  assert.match(dashboard, /dashboard-period-preset-active/);
  assert.match(agenda, /<OnlineBookingSettingsDialog/);
  assert.match(agenda, /AgendaMonthPicker/);
  assert.match(agenda, /agenda-calendar-controls/);
  assert.match(configuration, /OnlineBookingSettingsDialog/);
  assert.match(configuration, /copyCourtWeeklyRuleAction/);
  assert.match(actions, /export async function copyCourtWeeklyRuleAction/);
  assert.match(actions, /targetWeekday: z\.union\(\[z\.string\(\)\.regex\(\/\^\[0-6\]\$\//);
});
