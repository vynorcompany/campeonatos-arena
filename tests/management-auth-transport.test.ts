import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { backendOrigin } from '../src/lib/backend/http-client';
import { managementAuthenticationCookie } from '../src/lib/backend/management-auth-cookie';
import * as contracts from '../src/lib/backend/contracts/management-auth';

const source = readFileSync(new URL('../src/lib/backend/management-auth-client.ts', import.meta.url), 'utf8');
test('management auth relays only its cookies, origin and device label and validates all issued cookies first', async () => {
  const writes: any[] = [];
  let invalid = false;
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const modules: Record<string, unknown> = {
    'server-only': {},
    'next/headers': {
      cookies: async () => ({ get: (name: string) => { assert.ok(['padel_session', 'padel_arena'].includes(name)); return { value: name === 'padel_session' ? 'a'.repeat(64) : 'arena-a' }; }, set: (value: unknown) => writes.push(value) }),
      headers: async () => new Headers({ origin: 'https://arena.example', 'user-agent': 'Synthetic browser', authorization: 'must-not-forward' }),
    },
    '@/lib/backend/http-client': { backendOrigin },
    '@/lib/backend/management-auth-cookie': { managementAuthenticationCookie },
    '@/lib/backend/contracts/management-auth': contracts,
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Headers, URL, AbortSignal, process: { env: { NODE_ENV: 'production' } },
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    fetch: async (url: URL, options: RequestInit) => {
      assert.equal(url.href, 'http://backend.internal:3000/api/management/auth/login');
      assert.equal(options.redirect, 'error');
      const headers = options.headers as Headers;
      assert.equal(headers.get('user-agent'), 'Synthetic browser');
      assert.equal(headers.get('origin'), 'https://arena.example');
      assert.equal(headers.get('authorization'), null);
      assert.equal(headers.get('cookie'), `padel_session=${'a'.repeat(64)}; padel_arena=arena-a`);
      assert.deepEqual(JSON.parse(options.body as string), { email: 'staff@example.invalid', password: 'synthetic' });
      return { ok: true, json: async () => ({ error: null, redirectTo: '/painel' }), headers: { getSetCookie: () => [`padel_session=${'b'.repeat(64)}; HttpOnly`, 'padel_arena=arena-a', ...(invalid ? ['arena_player_session=forged'] : [])] } };
    },
  });
  const form = new FormData(); form.set('email', 'staff@example.invalid'); form.set('password', 'synthetic'); form.set('systemRole', 'SUPER_ADMIN');
  assert.equal((await exports.remoteManagementAuthentication('http://backend.internal:3000', 'login', form)).redirectTo, '/painel');
  assert.equal(writes.length, 2); assert.ok(writes.every(cookie => cookie.secure && cookie.httpOnly && cookie.path === '/'));
  invalid = true;
  await assert.rejects(exports.remoteManagementAuthentication('http://backend.internal:3000', 'login', form), /Unexpected management cookie/);
  assert.equal(writes.length, 2);
});
