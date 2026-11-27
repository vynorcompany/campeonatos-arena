import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../src/lib/backend/contracts/notifications';
import { backendOrigin } from '../src/lib/backend/http-client';

test('notification mutations forward only their own session and origin, rejecting forged actors before transport', async () => {
  const requests: Array<{ url: URL; init: RequestInit }> = [];
  const modules: Record<string, unknown> = {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: (name: string) => name === 'arena_player_session' ? { value: 'athlete-token' } : { value: 'must-not-forward' } }), headers: async () => new Headers({ origin: 'https://portal.example.test', authorization: 'must-not-forward' }) },
    '@/lib/backend/http-client': { backendOrigin },
    '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff-token' },
    '@/lib/backend/contracts/notifications': contracts,
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/notifications-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, AbortSignal, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    fetch: async (url: URL, init: RequestInit) => { requests.push({ url, init }); return Response.json({ error: null }); },
  });
  await exports.remotePortalNotificationRead('https://backend.example.test', 'arena-a', [{ id: 'note', source: 'PLAYER' }]);
  assert.equal(requests[0].url.href, 'https://backend.example.test/api/portal/notifications/read');
  const portalHeaders = new Headers(requests[0].init.headers);
  assert.equal(portalHeaders.get('cookie'), 'arena_player_session=athlete-token');
  assert.equal(portalHeaders.get('origin'), 'https://portal.example.test');
  assert.equal(portalHeaders.get('authorization'), null);
  assert.equal(requests[0].init.redirect, 'error');
  await exports.remoteManagementNotificationRead('https://backend.example.test', 'notice');
  assert.equal(new Headers(requests[1].init.headers).get('cookie'), 'padel_session=staff-token');
  assert.equal(JSON.parse(requests[1].init.body as string).operation, 'one');
  await assert.rejects(exports.remotePortalNotificationRead('https://backend.example.test', 'arena-a', [{ id: 'note', source: 'PLAYER', playerId: 'other' }]));
  assert.equal(requests.length, 2);
  assert.equal(contracts.portalNotificationReadSchema.safeParse({ arenaSlug: 'arena-a', entries: [], playerId: 'other' }).success, false);
  assert.equal(contracts.managementNotificationReadSchema.safeParse({ operation: 'all', arenaId: 'other' }).success, false);
});

test('portal read facade refreshes the existing pages only after a successful backend write', async () => {
  const paths: string[] = [];
  let error: string | null = null;
  const modules: Record<string, unknown> = {
    'next/cache': { revalidatePath: (path: string) => paths.push(path) },
    '@/lib/backend/notifications-client': { remotePortalNotificationRead: async () => ({ error }) },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/actions/public-player-notifications.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
  });
  await exports.markAllPublicPlayerNotificationsReadAction('arena-a', []);
  assert.deepEqual(paths, ['/classificacao/arena-a', '/home']);
  error = 'Falha ao gravar'; paths.length = 0;
  const result = await exports.markAllPublicPlayerNotificationsReadAction('arena-a', []);
  assert.equal(result.error, error); assert.deepEqual(paths, []);
});
