import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/financial-settings';

test('financial settings contract refuses unknown areas and stored secrets', () => {
  assert.equal(contracts.financialSettingsAreaSchema.safeParse('../../private').success, false);
  const empty = { productCategories: [], coupons: [], fiscal: null, connections: [], categories: [], rows: [] };
  assert.deepEqual(contracts.financialSettingsPageSchema.parse(empty), empty);
  assert.equal(contracts.financialSettingsPageSchema.safeParse({ ...empty, encryptedSecrets: 'private' }).success, false);
  assert.equal(contracts.financialSettingsPageSchema.safeParse({ ...empty, connections: [{ provider: 'ASAAS', status: 'CONNECTED', displayName: 'Conta', accountReference: 'account', encryptedSecrets: 'private' }] }).success, false);
});

test('settings service converts fiscal token storage to presence only and selects safe connection columns', async () => {
  const settings = { crt: '1', issuerState: 'PR', provider: 'FOCUS', environment: 'SANDBOX', series: '1', nextNumber: 1, notes: '', focusCnpj: '11222333000181', encryptedFocusTokens: 'synthetic-encrypted-token' };
  const db = { fiscalSettings: { findUnique: async () => settings }, paymentConnection: { findMany: async (query: any) => { assert.deepEqual(JSON.parse(JSON.stringify(query.select)), { provider: true, status: true, displayName: true, accountReference: true }); return [{ provider: 'ASAAS', status: 'CONNECTED', displayName: 'Conta', accountReference: 'reference' }]; } } };
  const modules: Record<string, unknown> = { 'server-only': {}, '@/lib/arena-database': { arenaDatabase: (id: string) => { assert.equal(id, 'arena-authenticated'); return db; } }, '@/lib/rls': {}, '@/lib/finance/bank-balance': {}, '@/lib/backend/contracts/financial-settings': contracts };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/services/financial-settings.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Boolean, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const fiscal = await exports.resolveFinancialSettingsPage('arena-authenticated', 'notas-fiscais');
  assert.equal(fiscal.fiscal.hasFocusTokens, true); assert.equal(JSON.stringify(fiscal).includes('synthetic-encrypted-token'), false); assert.equal('encryptedFocusTokens' in fiscal.fiscal, false);
  await exports.resolveFinancialSettingsPage('arena-authenticated', 'pagamentos-online');
});
