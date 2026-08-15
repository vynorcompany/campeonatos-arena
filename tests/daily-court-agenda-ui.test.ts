import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("daily court agenda renders time rows, court columns and a configuration entry point", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");

  assert.match(page, /agenda-date-strip/);
  assert.match(page, /agenda-date-item-centered/);
  assert.match(page, /scheduleOccurrences/);
  assert.match(page, /daily-court-grid/);
  assert.match(page, /Agenda de quadras/);
  assert.match(page, /\/agenda\/configuracao/);
  assert.match(page, /priceCents/);
  assert.match(page, /daily-court-unavailable/);
  assert.doesNotMatch(page, /<header className="page-header agenda-header">/);
});

test("agenda configuration presents court selection and periods as one operational workspace", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");

  assert.match(page, /agenda-config-toolbar/);
  assert.match(page, /agenda-court-tabs/);
  assert.match(page, /agenda-court-workspace/);
  assert.match(page, /agenda-create-court-inline/);
  assert.match(page, /weekly-rule-form/);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(page, /page-header agenda-header/);
  assert.match(page, /agenda\/configuracao\/\$\{court\.id\}/);
});
