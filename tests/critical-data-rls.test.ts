import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migrationPath = "prisma/migrations/20260904150000_enforce_critical_arena_rls/migration.sql";

test("critical operational tables enforce a transaction-scoped arena RLS policy", () => {
  assert.ok(existsSync(resolve(process.cwd(), migrationPath)), "critical RLS migration is missing");

  const migration = read(migrationPath);
  for (const table of ["FinancialEntry", "FinancialSettlement", "Comanda", "ComandaItem", "Sale", "SalePayment", "SaleItem", "ScheduleOccurrence", "ScheduleParticipant", "ScheduleOccurrenceCourt"]) {
    assert.match(migration, new RegExp(`ALTER TABLE \"${table}\" ENABLE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`ALTER TABLE \"${table}\" FORCE ROW LEVEL SECURITY`));
  }
  assert.match(migration, /current_setting\('app\.arena_id', true\)/);
  assert.match(migration, /CREATE POLICY "arena_scope_financial_entry"/);
  assert.match(migration, /CREATE POLICY "arena_scope_comanda_item"[\s\S]*EXISTS/);
  assert.match(migration, /CREATE POLICY "arena_scope_schedule_participant"[\s\S]*EXISTS/);
});

test("application runtime uses a non-administrative database URL and scopes critical transactions", () => {
  const prisma = read("src/lib/prisma.ts");
  const env = read("src/lib/env.ts");
  const rls = read("src/lib/rls.ts");
  const finance = read("src/lib/actions/finance.ts");
  const comanda = read("src/lib/actions/comanda.ts");
  const calendar = read("src/lib/actions/calendar.ts");

  assert.match(env, /APP_DATABASE_URL/);
  assert.match(prisma, /env\.appDatabaseUrl/);
  assert.match(rls, /set_config\('app\.arena_id'/);
  assert.match(rls, /prisma\.\$transaction/);
  assert.match(finance, /withArenaTransaction/);
  assert.match(comanda, /withArenaTransaction/);
  assert.match(calendar, /withArenaTransaction/);
});
