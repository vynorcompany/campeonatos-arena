import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { productDetailDataSchema } from '../src/lib/backend/contracts/product-detail';
import { productFiscalProfileSchema } from '../src/lib/fiscal/product-profile';
import { productPageDataSchema } from '../src/lib/backend/contracts/product-pages';
import * as contracts from '../src/lib/backend/contracts/product-mutations';
import { backendOrigin } from '../src/lib/backend/http-client';
test('product contracts refuse entity secrets and caller authority', () => {
  const data = { products: [], categories: [], courts: [], prices: [], services: [] };
  assert.deepEqual(productPageDataSchema.parse(data), data);
  assert.equal(productPageDataSchema.safeParse({ ...data, products: [{ id: 'p', name: 'P', sku: '', active: true, stockQuantity: 1, minStock: 0, priceCents: 100, category: null, fiscalProfile: { private: true } }] }).success, false);
  for (const fields of [{ arenaId: 'other' }, { userId: 'other' }, { price: ['1','2'] }]) assert.equal(contracts.productMutationInputSchema('save-service').safeParse({ fields }).success, false);
  assert.equal(contracts.productMutationOutcomeSchema.safeParse({ id: 'internal' }).success, false);
});
test('product facade preserves cache routes only for confirmed writes', async () => {
  const paths: string[] = []; let result: Record<string, string> = {}; let fail = false; const exported: Record<string, Function> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/cache': { revalidatePath: (p: string) => paths.push(p) }, '@/lib/backend/product-mutations-client': { remoteProductMutation: async () => { if (fail) throw new Error('private connection details'); return result; } } };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/products/mutation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  await exported.runProductMutation('standard-service-price', new FormData()); assert.deepEqual(paths, ['/pdv', '/pdv/servicos', '/agenda', '/comandas']); paths.length = 0;
  for (const operation of ['save-service', 'manage-service']) { await exported.runProductMutation(operation, new FormData()); assert.deepEqual(paths, ['/pdv/servicos', '/agenda', '/comandas', '/home']); paths.length = 0; }
  const fiscalForm = new FormData(); fiscalForm.set('productId', 'product-a'); await exported.runProductMutation('product-fiscal', fiscalForm); assert.deepEqual(paths, ['/pdv/product-a', '/pdv/estoque']); paths.length = 0;
  result = { error: 'Serviço inválido.' }; assert.deepEqual(await exported.runProductMutation('save-service', new FormData()), result); assert.deepEqual(paths, []);
  fail = true; const failure = await exported.runProductMutation('save-service', new FormData()); assert.equal(failure.error.includes('private'), false); assert.deepEqual(paths, []);
});
test('product transport sends only staff cookies and explicit scalar fields, never retrying', async () => {
  const calls: {url:URL;init:RequestInit}[] = []; let fail = false; const exported: Record<string, Function> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/headers': { headers: async () => new Headers({ origin: 'https://front.example.test' }) }, '@/lib/backend/http-client': { backendOrigin }, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=fixture' }, '@/lib/backend/contracts/product-mutations': contracts };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/product-mutations-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported, URL, AbortSignal, JSON, Object, Error, fetch: async (url:URL,init:RequestInit) => { calls.push({url,init}); if(fail) throw new Error('timeout'); return Response.json({}); }, require: (name:string) => { assert.ok(name in modules,name); return modules[name]; } });
  const form = new FormData(); form.set('id','service'); form.set('operation','duplicate'); form.set('arenaId','forged');
  await exported.remoteProductMutation('https://backend.example.test','manage-service',form); assert.deepEqual(JSON.parse(calls[0].init.body as string),{fields:{id:'service',operation:'duplicate'}}); assert.equal(calls[0].url.pathname,'/api/management/products/actions/manage-service'); assert.equal(new Headers(calls[0].init.headers).get('cookie'),'padel_session=fixture'); assert.equal(new Headers(calls[0].init.headers).get('authorization'),null); assert.equal(calls[0].init.redirect,'error'); assert.equal(calls[0].init.cache,'no-store');
  form.append('id','other'); await assert.rejects(exported.remoteProductMutation('https://backend.example.test','manage-service',form)); assert.equal(calls.length,1);
  form.delete('id'); form.set('id','service'); fail=true; await assert.rejects(exported.remoteProductMutation('https://backend.example.test','manage-service',form)); assert.equal(calls.length,2);
});

test('balance fields and outcomes preserve counts without accepting caller authority', () => {
  assert.equal(contracts.productMutationInputSchema('stock-balance').safeParse({ fields: { title: 'Inventário', count_product: '12', count_unchecked: '' } }).success, true);
  for (const operation of ['create-product', 'adjust-stock', 'create-sale']) assert.equal(contracts.productMutationInputSchema(operation as contracts.ProductMutationOperation).safeParse({ fields: { count_product: '12' } }).success, false);
  assert.equal(contracts.productMutationInputSchema('stock-balance').safeParse({ fields: { arenaId: 'foreign' } }).success, false);
  assert.equal(contracts.productMutationInputSchema('stock-balance').safeParse({ fields: { count_: '1' } }).success, false);
  assert.equal(contracts.productOutcomeSchema('stock-balance').safeParse({ updated: 2 }).success, true);
  for (const result of [{}, { updated: 0 }, { updated: 2, arenaId: 'private' }]) assert.equal(contracts.productOutcomeSchema('stock-balance').safeParse(result).success, false);
  assert.equal(contracts.productOutcomeSchema('create-product').safeParse({ updated: 2 }).success, false);
  assert.equal(contracts.productMutationModules['create-sale'], 'pos');
  assert.equal(contracts.productMutationModules['adjust-stock'], 'stock');
  assert.equal(contracts.productMutationInputSchema('create-cart-sale').safeParse({ fields: { customerName: 'x'.repeat(16385) } }).success, false);
});

test('product detail exposes only editor data and never fiscal provider credentials', () => {
  const data = { product: { id: 'p', name: 'P', sku: '', notes: '', priceCents: 500, costCents: 200, stockQuantity: 2, minStock: 0, categoryId: null, isService: false, updatedAt: '2026-11-27T00:00:00.000Z', stockAggregates: [], stockChoices: [], fiscalProfile: productFiscalProfileSchema.parse({}), stockMovements: [] }, categories: [], aggregateProducts: [], issuer: { crt: '1', issuerState: 'PR' } };
  assert.deepEqual(productDetailDataSchema.parse(data), data);
  assert.equal(productDetailDataSchema.parse(null), null);
  assert.equal(productDetailDataSchema.safeParse({ ...data, issuer: { ...data.issuer, apiToken: 'private' } }).success, false);
  assert.equal(productDetailDataSchema.safeParse({ ...data, product: { ...data.product, arenaId: 'foreign' } }).success, false);
});
