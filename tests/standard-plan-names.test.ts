import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { normalizeStandardPlanName, uniqueStandardPlanOptions } from "../src/lib/academy/standard-plans";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("a normalização de nomes legados continua preservando o modelo canônico", () => {
  assert.equal(normalizeStandardPlanName("Mensal · Professor QA", ["Professor QA"]), "Mensal");
  assert.equal(normalizeStandardPlanName("Mensal | Professor QA", ["Professor QA"]), "Mensal");
  assert.deepEqual(uniqueStandardPlanOptions([{ id: "legacy", name: "Mensal · Professor QA", classesPerMonth: 4 }, { id: "canonical", name: "Mensal", classesPerMonth: 4 }], ["Professor QA"]), [{ id: "canonical", name: "Mensal", classesPerMonth: 4 }]);
});

test("a consolidação dos planos legados preserva os vínculos antes de excluir duplicatas", () => {
  const migrationPath = resolve(root, "prisma/migrations/20260909090000_normalize_standard_plan_names/migration.sql");

  assert.equal(existsSync(migrationPath), true);
  const migration = read("prisma/migrations/20260909090000_normalize_standard_plan_names/migration.sql");

  assert.match(migration, /"StudentSubscription"/);
  assert.match(migration, /"FinancialEntry"/);
  assert.match(migration, /"FinancialRecurrence"/);
  assert.match(migration, /"TeacherPlan"/);
  assert.match(migration, /"ClassGroupPlan"/);
  assert.match(migration, /DELETE FROM "Plan"/);
});
