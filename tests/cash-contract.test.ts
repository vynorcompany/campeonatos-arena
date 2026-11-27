import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/cash-register';
import { backendOrigin } from '../src/lib/backend/http-client';
test('cash contracts refuse caller authority, dates and hidden financial fields', () => {
  for (const fields of [{ arenaId: 'other' }, { userId: 'other' }, { referenceDate: '2026-11-01' }, { expectedAmountCents: '0' }]) assert.equal(contracts.cashMutationInputSchema('open').safeParse({ fields }).success, false);
  assert.equal(contracts.cashMutationOutcomeSchema.safeParse({ id: 'internal' }).success, false);
  const cash = { referenceDate: '2026-11-27T00:00:00.000Z', register: null, previousClosing: null };
  assert.deepEqual(contracts.cashWorkspaceDataSchema.parse(cash), cash);
  assert.equal(contracts.cashWorkspaceDataSchema.safeParse({ ...cash, arenaId: 'private' }).success, false);
  const sales = { sales: [{ id: 's', code: 'SALE', totalCents: 100, paymentMethod: 'PIX', createdAt: cash.referenceDate, items: [{ quantity: 1, productName: 'Produto' }] }], stockMovements: [] };
  assert.deepEqual(contracts.salesWorkspaceDataSchema.parse(sales), sales);
  assert.equal(contracts.salesWorkspaceDataSchema.safeParse({ ...sales, sales: [{ ...sales.sales[0], customerName: 'private', fiscalProfile: {} }] }).success, false);
});
test('cash facade refreshes confirmed writes only and hides transport errors', async () => {
  const paths: string[] = []; let result: object = {}; let fail = false; const exported: Record<string, Function> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/cache': { revalidatePath: (p: string) => paths.push(p) }, '@/lib/backend/cash-mutations-client': { remoteCashMutation: async () => { if (fail) throw Error('private connection'); return result; } } };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/products/cash-mutation.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  for (const operation of ['open','movement','close']) { await exported.runCashMutation(operation, new FormData()); assert.deepEqual(paths, ['/pdv/caixa','/relatorios/caixa','/painel']); paths.length = 0; }
  result = { error: 'Caixa encerrado.' }; assert.deepEqual(await exported.runCashMutation('movement', new FormData()), result); assert.deepEqual(paths, []);
  fail = true; const failure = await exported.runCashMutation('open', new FormData()); assert.equal(failure.error.includes('private'), false); assert.deepEqual(paths, []);
});
test('cash transport strips authority, rejects repeated fields and does not retry writes', async () => {
  const calls: {url: URL; init: RequestInit}[] = []; let fail = false; const exported: Record<string, Function> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/headers': { headers: async () => new Headers({ origin: 'https://front.example.test' }) }, '@/lib/backend/http-client': { backendOrigin }, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=fixture' }, '@/lib/backend/contracts/cash-register': contracts };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/cash-mutations-client.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported, URL, AbortSignal, JSON, Object, Error, fetch: async (url: URL, init: RequestInit) => { calls.push({url,init}); if (fail) throw Error('timeout'); return Response.json({}); }, require: (name: string) => { assert.ok(name in modules,name); return modules[name]; } });
  const form = new FormData(); form.set('openingAmount','10,00'); form.set('arenaId','forged');
  await exported.remoteCashMutation('https://backend.example.test','open',form); assert.deepEqual(JSON.parse(calls[0].init.body as string),{fields:{openingAmount:'10,00'}}); assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture'); assert.equal(new Headers(calls[0].init.headers).get('authorization'),null); assert.equal(calls[0].init.redirect,'error'); assert.equal(calls[0].init.cache,'no-store');
  form.append('openingAmount','20,00'); await assert.rejects(exported.remoteCashMutation('https://backend.example.test','open',form)); assert.equal(calls.length,1);
  form.set('openingAmount','10,00'); fail=true; await assert.rejects(exported.remoteCashMutation('https://backend.example.test','open',form)); assert.equal(calls.length,2);
});
