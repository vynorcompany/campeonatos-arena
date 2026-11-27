import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/teacher-plan-billing';
import { backendOrigin } from '../src/lib/backend/http-client';
test('teacher billing refuses authority fields and private quote records', () => {
  assert.equal(contracts.teacherBillingInputSchema('preview').safeParse({ fields: { teacherId: 't', subscriptionId: 's', targetPlanId: 'p', newDueDate: '2026-12-20' } }).success, true);
  for (const fields of [{ arenaId: 'other' }, { userId: 'other' }, { amount: ['1', '2'] }]) assert.equal(contracts.teacherBillingInputSchema('schedule').safeParse({ fields }).success, false);
  assert.equal(contracts.teacherBillingMutationSchema.safeParse({ quote: {} }).success, false);
  assert.equal(contracts.teacherTransferPreviewSchema.safeParse({ quote: { token: 'a'.repeat(64), subscription: { passwordHash: 'private' } } }).success, false);
  assert.equal(contracts.teacherTransferPreviewSchema.safeParse({}).success, false);
});
test('billing transport relays only staff cookies and explicit fields, without retry', async () => {
  const requests: { url: URL; init: RequestInit }[] = []; let fail = false;
  const exported: Record<string, Function> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/headers': { headers: async () => new Headers({ origin: 'https://front.example.test' }) }, '@/lib/backend/http-client': { backendOrigin }, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=fixture' }, '@/lib/backend/contracts/teacher-plan-billing': contracts };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/teacher-billing-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported, URL, AbortSignal, JSON, Object, Error, fetch: async (url: URL, init: RequestInit) => { requests.push({ url, init }); if (fail) throw new Error('timeout'); return Response.json({}); }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const form = new FormData(); form.set('changeId', 'change'); form.set('arenaId', 'forged');
  await exported.remoteTeacherBilling('https://backend.example.test', 'cancel', form);
  assert.deepEqual(JSON.parse(requests[0].init.body as string), { fields: { changeId: 'change' } });
  assert.equal(requests[0].url.pathname, '/api/management/academy/teacher-billing/cancel'); assert.equal(new Headers(requests[0].init.headers).get('cookie'), 'padel_session=fixture'); assert.equal(new Headers(requests[0].init.headers).get('authorization'), null);
  assert.equal(requests[0].init.cache, 'no-store'); assert.equal(requests[0].init.redirect, 'error');
  form.append('changeId', 'duplicate'); await assert.rejects(exported.remoteTeacherBilling('https://backend.example.test', 'cancel', form)); assert.equal(requests.length, 1);
  form.delete('changeId'); form.set('changeId', 'change'); fail = true; await assert.rejects(exported.remoteTeacherBilling('https://backend.example.test', 'cancel', form)); assert.equal(requests.length, 2);
});
test('preview never refreshes, confirmed writes preserve cache paths and timeout stays visible', async () => {
  let outcome: Record<string, unknown> = {}; let fail = false; const paths: string[] = []; const exported: Record<string, Function> = {};
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/cache': { revalidatePath: (p: string) => paths.push(p) }, '@/lib/academy/revalidation': { refreshAcademyRoutes: () => paths.push('academy') }, '@/lib/backend/teacher-billing-client': { remoteTeacherBilling: async () => { if (fail) throw new Error('private provider detail'); return outcome; } } };
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/academy/teacher-billing-mutation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: exported, String, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const form = new FormData(); form.set('teacherId', 'teacher');
  await exported.runTeacherBilling('preview', form); assert.deepEqual(paths, []);
  await exported.runTeacherBilling('transfer', form); assert.deepEqual(paths, ['academy', '/professores/teacher', '/financeiro', '/home']); paths.length = 0;
  outcome = { error: 'Os dados mudaram.' }; await exported.runTeacherBilling('transfer', form); assert.deepEqual(paths, []);
  fail = true; const failure = await exported.runTeacherBilling('transfer', form); assert.match(failure.error, /Confira o plano/); assert.equal(failure.error.includes('private'), false); assert.deepEqual(paths, []);
});
