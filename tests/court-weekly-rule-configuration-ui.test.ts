import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("agenda configuration manages weekly ranges for the selected court", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/configuracao/page.tsx"), "utf8");
  assert.match(page, /Quadra selecionada/);
  assert.match(page, /Dia da semana/);
  assert.match(page, /Valor do horário/);
  assert.match(page, /createCourtWeeklyRuleAction/);
  assert.match(page, /deleteCourtWeeklyRuleAction/);
  assert.match(page, /weeklyRules/);
});
