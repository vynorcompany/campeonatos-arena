import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/academy-mutations';
import { backendOrigin } from '../src/lib/backend/http-client';

test('academy contracts preserve schedule alignment and reject caller-controlled authority', () => {
  const fields = { teacherId: ['teacher'], planIds: ['plan-a', 'plan-b'], weekdays: ['1', '3'], startTimes: ['08:00', '09:00'], capacities: ['4', '6'] };
  assert.deepEqual(contracts.academyMutationInputSchema('create-class-group').parse({ fields }), { fields });
  assert.equal(contracts.academyMutationInputSchema('create-class-group').safeParse({ fields: { ...fields, arenaId: ['forged'] } }).success, false);
  assert.equal(contracts.academyMutationInputSchema('add-student-credits').safeParse({ fields: { studentId: ['a', 'b'] } }).success, false);
  assert.equal(contracts.academyMutationInputSchema('request-lesson-credit-reschedule').safeParse({ fields: { arenaSlug: ['arena'], batchId: ['batch'], playerId: ['forged'] } }).success, false);
  assert.equal(contracts.academyMutationOutcomeSchema.safeParse({ passwordHash: 'secret' }).success, false);
});

test('academy writes select one authentication realm and never retry uncertain writes', async () => {
  const requests: Array<{ url: URL; init: RequestInit }> = []; let fail = false;
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/headers': { headers: async () => new Headers({ origin: 'https://arena.example.test', authorization: 'secret' }), cookies: async () => ({ get: (name: string) => name === 'arena_player_session' ? { value: 'athlete-token' } : { value: 'must-not-forward' } }) }, '@/lib/backend/http-client': { backendOrigin }, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff; padel_arena=arena' }, '@/lib/backend/contracts/academy-mutations': contracts };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/academy-mutations-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, AbortSignal, encodeURIComponent, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; }, fetch: async (url: URL, init: RequestInit) => { requests.push({ url, init }); if (fail) throw Error('Uncertain timeout'); return Response.json({}); } });
  const form = new FormData(); form.set('studentId', 'student'); form.set('quantity', '2'); form.set('arenaId', 'forged');
  await exports.remoteAcademyMutation('https://backend.example.test', 'add-student-credits', form);
  assert.equal(new Headers(requests[0].init.headers).get('cookie'), 'padel_session=staff; padel_arena=arena');
  assert.deepEqual(JSON.parse(requests[0].init.body as string).fields, { studentId: ['student'], quantity: ['2'] });
  const request = new FormData(); request.set('arenaSlug', 'arena'); request.set('batchId', 'batch');
  await exports.remoteAcademyMutation('https://backend.example.test', 'request-lesson-credit-reschedule', request);
  assert.equal(requests[1].url.pathname, '/api/portal/academy/actions/request-lesson-credit-reschedule');
  assert.equal(new Headers(requests[1].init.headers).get('cookie'), 'arena_player_session=athlete-token');
  assert.equal(new Headers(requests[1].init.headers).get('authorization'), null);
  assert.equal(requests[1].init.redirect, 'error'); assert.equal(requests[1].init.cache, 'no-store');
  fail = true; await assert.rejects(exports.remoteAcademyMutation('https://backend.example.test', 'request-lesson-credit-reschedule', request)); assert.equal(requests.length, 3);
});

test('academy facade preserves success forms and refreshes only confirmed writes', async () => {
  let result: Record<string, string> = {}; const paths: string[] = [];
  const modules: Record<string, unknown> = { 'server-only': {}, 'next/cache': { revalidatePath: (path: string) => paths.push(path) }, '@/lib/academy/revalidation': { refreshAcademyRoutes: () => paths.push('academy') }, '@/lib/backend/academy-mutations-client': { remoteAcademyMutation: async () => result }, '@/lib/backend/contracts/academy-mutations': contracts };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/academy/mutation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, String, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const form = new FormData(); form.set('teacherId', 'teacher');
  assert.equal(await exports.runAcademyMutation('create-student', form), undefined); assert.deepEqual(paths, ['academy']); paths.length = 0;
  assert.deepEqual(await exports.runAcademyMutation('create-teacher-plan-with-price', form), {}); assert.deepEqual(paths, ['academy', '/professores/teacher', '/financeiro/planos']); paths.length = 0;
  await exports.runAcademyMutation('save-lesson-plan-expiry', form); assert.deepEqual(paths, ['academy', '/home', '/financeiro/planos']); paths.length = 0;
  result = { error: 'Sem créditos disponíveis.' }; await exports.runAcademyMutation('complete-lesson', form); assert.deepEqual(paths, []);
});
