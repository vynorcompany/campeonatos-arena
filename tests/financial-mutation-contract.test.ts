import assert from 'node:assert/strict';
import test from 'node:test';
import { financialMutationInputSchema, financialMutationOutcomeSchema, financialChargeOutcomeSchema } from '../src/lib/backend/contracts/financial-mutations';

test('financial bulk transport preserves identities and optimistic versions', () => {
  const fields = { entryIds: ['entry-a', 'entry-b'], expectedVersions: [JSON.stringify({ 'entry-a': '2026-11-26T12:00:00.000Z', 'entry-b': '2026-11-26T13:00:00.000Z' })], paymentMethod: ['PIX'] };
  assert.deepEqual(financialMutationInputSchema('settle-bulk').parse({ fields }), { fields });
  assert.equal(financialMutationInputSchema('settle').safeParse({ fields: { entryId: ['a', 'b'] } }).success, false);
  assert.equal(financialMutationInputSchema('settle-bulk').safeParse({ fields: { expectedVersions: ['{}', '{}'] } }).success, false);
  assert.equal(financialMutationInputSchema('delete-bulk').safeParse({ fields: { entryIds: Array(2001).fill('a') } }).success, false);
});

test('financial contracts reject caller-controlled authority and unrelated fields', () => {
  for (const key of ['arenaId', 'actorId', 'userId', 'permissions', 'status']) {
    assert.equal(financialMutationInputSchema('settle').safeParse({ fields: { entryId: ['a'], [key]: ['forged'] } }).success, false, key);
  }
  assert.equal(financialMutationInputSchema('create').safeParse({ fields: {}, arenaId: 'forged' }).success, false);
});

test('custom installments cross the boundary without amount or date coercion', () => {
  const rows = JSON.stringify([{ amount: '10,01', dueDate: '2026-12-01' }, { amount: '9,99', dueDate: '2027-01-01' }]);
  const fields = { cardInstallmentRows: [rows], cardInstallmentCount: ['2'], installmentRequestId: ['request-id'] };
  assert.deepEqual(financialMutationInputSchema('split-card').parse({ fields }), { fields });
  assert.equal(financialMutationInputSchema('split-card').safeParse({ fields: { cardInstallmentRows: ['a'.repeat(10001)] } }).success, false);
});

test('financial results preserve error and notice discriminants and reject unsafe payment links', () => {
  assert.deepEqual(financialMutationOutcomeSchema.parse({}), {});
  assert.deepEqual(financialMutationOutcomeSchema.parse({ notice: 'Cobrança criada; emissão pendente.' }), { notice: 'Cobrança criada; emissão pendente.' });
  assert.deepEqual(financialMutationOutcomeSchema.parse({ error: 'Registro alterado.' }), { error: 'Registro alterado.' });
  for (const url of ['javascript:alert(1)', 'https://secret@example.test/pay', 'file:///etc/passwd']) {
    assert.equal(financialChargeOutcomeSchema.safeParse({ url, code: '', method: 'PIX' }).success, false);
  }
  assert.equal(financialChargeOutcomeSchema.safeParse({ url: 'https://example.test/pay', code: 'pix-code', method: 'PIX' }).success, true);
  assert.equal(financialMutationOutcomeSchema.safeParse({ error: null }).success, false);
  assert.equal(financialMutationOutcomeSchema.safeParse({ passwordHash: 'secret' }).success, false);
});

test('financial transport sends only management cookies and never retries uncertain writes', async () => {
  const vm = await import('node:vm'); const ts = await import('typescript'); const { readFileSync } = await import('node:fs');
  const contracts = await import('../src/lib/backend/contracts/financial-mutations'); const { backendOrigin } = await import('../src/lib/backend/http-client');
  const requests: Array<{ url: URL; init: RequestInit }> = []; let uncertain = false;
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/headers': { headers: async () => new Headers({ origin: 'https://arena.example.test', authorization: 'secret' }) }, '@/lib/backend/http-client': { backendOrigin }, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff; padel_arena=arena' }, '@/lib/backend/contracts/financial-mutations': contracts };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/financial-mutations-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, AbortSignal, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; }, fetch: async (url: URL, init: RequestInit) => { requests.push({ url, init }); if (uncertain) throw new Error('Uncertain timeout'); return Response.json({}); } });
  const form = new FormData(); form.append('entryIds', 'a'); form.append('entryIds', 'b'); form.set('arenaId', 'forged'); form.set('actorId', 'forged');
  await exports.remoteFinancialMutation('https://backend.example.test', 'delete-bulk', form);
  assert.deepEqual(JSON.parse(requests[0].init.body as string).fields, { entryIds: ['a', 'b'] });
  assert.equal(new Headers(requests[0].init.headers).get('authorization'), null);
  assert.equal(new Headers(requests[0].init.headers).get('cookie'), 'padel_session=staff; padel_arena=arena');
  assert.equal(requests[0].init.redirect, 'error'); assert.equal(requests[0].init.cache, 'no-store');
  uncertain = true; await assert.rejects(exports.remoteFinancialMutation('https://backend.example.test', 'delete-bulk', form)); assert.equal(requests.length, 2);
});

test('financial facade refreshes only confirmed writes and preserves the original void result', async () => {
  const vm = await import('node:vm'); const ts = await import('typescript'); const { readFileSync } = await import('node:fs');
  let refreshes = 0; let result: Record<string, string> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, '@/lib/backend/financial-mutations-client': { remoteFinancialMutation: async () => result }, 'next/cache': { revalidatePath: () => refreshes++ }, '@/lib/finance/revalidation': { refreshFinanceRoutes: () => refreshes++, refreshFinancialSettings: () => refreshes++ } };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/finance/mutation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Object, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  assert.equal(await exports.runFinancialMutation('create', new FormData()), undefined); assert.equal(refreshes, 1);
  result = { error: 'Versão alterada.' }; await exports.runFinancialMutation('update', new FormData()); assert.equal(refreshes, 1);
  result = { notice: 'Emissão pendente.' }; await exports.runFinancialMutation('recurrence', new FormData()); assert.equal(refreshes, 2);
  result = {}; await exports.runFinancialMutation('settings-reconcile-bank-account-balance', new FormData()); assert.equal(refreshes, 4);
  await exports.runFinancialMutation('settings-update-fiscal-settings', new FormData()); assert.equal(refreshes, 6);
  await exports.runFinancialMutation('settings-connect-payment-provider', new FormData()); assert.equal(refreshes, 7);
  result = { error: 'Configuração inválida.' }; await exports.runFinancialMutation('settings-update-fiscal-settings', new FormData()); assert.equal(refreshes, 7);
});


test('settings contract includes Focus validation and secret inputs without accepting secret outputs', () => {
  const fields = { provider: ['FOCUS'], focusCnpj: ['00000000000000'], focusSandboxToken: ['synthetic-token'], focusProductionToken: [''], confirmProduction: ['on'] };
  assert.deepEqual(financialMutationInputSchema('settings-update-fiscal-settings').parse({ fields }), { fields });
  assert.equal(financialMutationInputSchema('settings-connect-payment-provider').safeParse({ fields: { privateKey: ['x'.repeat(65536)] } }).success, true);
  assert.equal(financialMutationInputSchema('settings-connect-payment-provider').safeParse({ fields: { privateKey: ['x'.repeat(65537)] } }).success, false);
  assert.equal(financialMutationOutcomeSchema.safeParse({ encryptedSecrets: 'must-never-be-returned' }).success, false);
});
