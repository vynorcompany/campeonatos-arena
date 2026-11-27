import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/finance-ledger';
import { defaultLedgerFilters } from '../src/lib/finance/default-ledger-filters';
function fixture() {
  const queries: any[] = [], ledgers: any[] = [];
  const table = (name: string, rows: any) => ({ findMany: async (query: any) => { queries.push({ name, query }); assert.equal(query.where.arenaId, 'session-arena'); return typeof rows === 'function' ? rows(query) : rows; } });
  const db = {
    paymentMethodSetting: table('methods', []), financialCategory: table('categories', [{ name: 'Atual' }]), bankAccount: table('banks', [{ id: 'bank', name: 'Banco' }]),
    plan: table('plans', (query: any) => query.select.teacherAssignments ? [{ id: 'plan', name: 'Plano', monthlyPriceCents: 10000, teacherAssignments: [{ teacher: { id: 'teacher', name: 'Professora' }, monthlyPriceCents: 15000 }] }] : [{ id: 'plan', name: 'Plano', monthlyPriceCents: 10000 }]),
    product: table('products', []), supplier: table('suppliers', [{ id: 'supplier', name: 'Fornecedor' }]), teacher: table('teachers', [{ id: 'teacher', name: 'Professora' }]),
    player: table('clients', [{ id: 'client', name: 'Cliente', phone: '41999990000' }]), arenaMember: table('employees', [{ user: { id: 'employee', name: 'Colaborador' } }]),
    financialEntry: { groupBy: async (query: any) => { assert.equal(query.where.arenaId, 'session-arena'); return [{ category: 'Histórica' }]; } },
  };
  const modules: Record<string, unknown> = { 'server-only': {}, '@/lib/backend/contracts/finance-ledger': contracts, '@/lib/finance/default-ledger-filters': { defaultLedgerFilters }, '@/lib/arena-database': { arenaDatabase: (arenaId: string) => { assert.equal(arenaId, 'session-arena'); return db; } }, '@/lib/finance/accounts': { getAccountsLedgerPage: async (...args: any[]) => { ledgers.push(args); return { total: 0, activeCount: 0, totalCents: 0, entries: [], page: 1, pageSize: 50 }; } } };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/services/finance-ledger.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Set, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return { load: (type: string, query: unknown) => exports.resolveFinanceLedgerPage('session-arena', type, query), queries, ledgers };
}
test('finance ledger preserves scoped options, per-teacher prices, defaults and legacy OPEN normalization', async () => {
  const data = fixture();
  const result = await data.load('REVENUE', { status: 'PENDING', start: '2026-11-01', end: '2026-11-30', pageSize: '50', includeEarlier: '1', dateField: 'paidAt' });
  assert.equal(result.filters.status, 'OPEN'); assert.equal(result.filters.includeEarlier, true); assert.equal(result.filters.dateField, 'paidAt');
  assert.equal(result.plans[0].teacherId, 'teacher'); assert.equal(result.plans[0].monthlyPriceCents, 15000);
  assert.deepEqual(result.categories, ['Atual', 'Histórica']); assert.equal(result.clients[0].phone, '41999990000');
  assert.equal(data.ledgers[0][0], 'session-arena'); assert.equal(data.ledgers[0][1], 'REVENUE'); assert.equal(data.ledgers[0][3].pageSize, '50');
  const payable = await data.load('EXPENSE', { status: 'ALL', start: '', end: '' });
  assert.equal(payable.suppliers[0].id, 'supplier'); assert.equal(payable.employees[0].id, 'employee'); assert.equal(payable.teachers[0].id, 'teacher');
  assert.ok(payable.paymentMethods.includes('Saldo de crédito'));
  await assert.rejects(data.load('REVENUE', { arenaId: 'other' })); await assert.rejects(data.load('REVENUE', { start: '2026-02-30' }));
  assert.equal(contracts.financeLedgerPageSchema.safeParse({ ...result, databaseUrl: 'secret' }).success, false);
});

test('frontend finance loader forwards only ledger filters and the management session', async () => {
  let request: any[] = [];
  const modules: Record<string, unknown> = { 'server-only': {}, '@/lib/backend/contracts/finance-ledger': contracts, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff' }, '@/lib/backend/http-client': { readBackendContract: async (...args: any[]) => { request = args; return {}; } } };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/finance/ledger-page.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URLSearchParams, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  await exports.getFinanceLedgerPage('do-not-forward', 'EXPENSE', { status: 'OPEN', pageSize: '20', arenaId: 'other', utm_source: 'test' });
  const url = new URL(request[1], request[0]); assert.equal(url.pathname, '/api/management/finance/ledger/payable');
  assert.equal(url.searchParams.get('status'), 'OPEN'); assert.equal(url.searchParams.has('arenaId'), false); assert.equal(url.searchParams.has('utm_source'), false); assert.equal(request[3].cookie, 'padel_session=staff');
});
