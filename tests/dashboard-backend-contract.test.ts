import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/dashboard';
import { buildDashboardAnalytics } from '../src/lib/reports/dashboard-analytics';
import { dashboardPeriod, shiftDashboardPeriod } from '../src/lib/reports/dashboard-period';
import { dashboardProjectedCost } from '../src/lib/reports/dashboard-projections';

const source = readFileSync(new URL('../src/lib/backend/services/dashboard.ts', import.meta.url), 'utf8');
test('dashboard backend applies existing calculations under the resolved arena and rejects invalid periods before reading', async () => {
  let reads = 0;
  const parameters: any[][] = [];
  const data = { entries: [], recurrences: [], occurrences: [], courts: [], lessons: [], portalAccounts: [], saleGroups: [], products: [], previousEntries: [], previousReservations: 0, clientActivity: { active: [], inactive: [] } };
  const modules: Record<string, unknown> = {
    'server-only': {},
    '@/lib/reports/dashboard-data': { loadDashboardData: async (arenaId: string, ...args: any[]) => { parameters.push(args); assert.equal(arenaId, 'arena-from-session'); reads++; return data; } },
    '@/lib/reports/dashboard-analytics': { buildDashboardAnalytics },
    '@/lib/reports/dashboard-period': { dashboardPeriod, shiftDashboardPeriod },
    '@/lib/reports/dashboard-projections': { dashboardProjectedCost },
    '@/lib/backend/contracts/dashboard': contracts,
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const invalid = await exports.resolveDashboardOverview('arena-from-session', { dataInicial: '2026-02-30', dataFinal: '2026-03-01' });
  assert.ok(invalid.error); assert.equal(reads, 0);
  const result = await exports.resolveDashboardOverview('arena-from-session', { dataInicial: '2026-01-01', dataFinal: '2026-01-31', visao: 'caixa' });
  assert.equal(result.analytics.received, 0); assert.equal(result.fixedCostCents, 0); assert.ok(result.analytics.cards.length > 10); assert.equal(reads, 1);
  assert.equal(parameters[0][3], undefined); assert.equal(parameters[0][4], undefined);
  await exports.resolveDashboardOverview('arena-from-session', { dataInicial: '2026-01-01', dataFinal: '2026-01-31', comparar: 'previous-month' });
  assert.ok(parameters[1][3] instanceof Date); assert.ok(parameters[1][4] instanceof Date);
  assert.equal(contracts.dashboardOverviewSchema.safeParse(JSON.parse(JSON.stringify(result))).success, true);
  assert.equal(contracts.dashboardOverviewSchema.safeParse({ ...result, entries: [{ passwordHash: 'private' }] }).success, false);
  assert.equal(contracts.dashboardQuerySchema.safeParse({ arenaId: 'forged' }).success, false);
});
