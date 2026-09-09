import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("planos padrão removem o sufixo legado do professor antes de chegar ao seletor", () => {
  const page = read("src/app/(app)/professores/[teacherId]/page.tsx");
  const normalizerPath = resolve(root, "src/lib/academy/standard-plans.ts");

  assert.match(page, /uniqueStandardPlanOptions/);
  assert.equal(existsSync(normalizerPath), true);
  const normalizer = read("src/lib/academy/standard-plans.ts");
  assert.match(normalizer, /export function normalizeStandardPlanName/);
  assert.match(normalizer, /` · \$\{teacherName\}`/);
  assert.match(normalizer, /` \| \$\{teacherName\}`/);
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
