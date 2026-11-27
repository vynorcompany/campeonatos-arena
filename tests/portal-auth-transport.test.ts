import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { backendOrigin } from '../src/lib/backend/http-client';
import { athleteSessionCookie } from '../src/lib/backend/auth-cookie';
import * as contracts from '../src/lib/backend/contracts/player-auth';

const source = readFileSync(new URL('../src/lib/backend/portal-auth-client.ts', import.meta.url), 'utf8');
test('Portal authentication relays only its own cookie and approved fields, without following redirects', async () => {
  const issued = 'b'.repeat(64);
  const writes: any[] = [];
  let invalidCookie = false;
  let calls = 0;
  const modules: Record<string, unknown> = {
    'server-only': {},
    'next/headers': {
      cookies: async () => ({ get: (name: string) => { assert.equal(name, 'arena_player_session'); return { value: 'a'.repeat(64) }; }, set: (value: unknown) => writes.push(value) }),
      headers: async () => new Headers({ origin: 'https://arena.example', authorization: 'must-not-forward' }),
    },
    '@/lib/backend/http-client': { backendOrigin },
    '@/lib/backend/auth-cookie': { athleteSessionCookie },
    '@/lib/backend/contracts/player-auth': contracts,
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Headers, URL, AbortSignal, process: { env: { NODE_ENV: 'production' } },
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    fetch: async (url: URL, options: RequestInit) => {
      calls++;
      assert.equal(url.href, 'http://backend.internal:3000/api/portal/auth/login-global');
      assert.equal(options.redirect, 'error');
      assert.equal(options.method, 'POST');
      const headers = options.headers as Headers;
      assert.equal(headers.get('origin'), 'https://arena.example');
      assert.equal(headers.get('authorization'), null);
      assert.equal(headers.get('cookie'), `arena_player_session=${'a'.repeat(64)}`);
      assert.deepEqual(JSON.parse(options.body as string), { phone: '00000000000', password: 'SyntheticPassword123!' });
      return {
        ok: true, json: async () => ({ error: null, redirectTo: '/portal' }),
        headers: { getSetCookie: () => [`arena_player_session=${issued}; HttpOnly; Max-Age=120`, ...(invalidCookie ? ['admin=forged'] : [])] },
      };
    },
  });
  const form = new FormData();
  form.set('phone', '00000000000'); form.set('password', 'SyntheticPassword123!'); form.set('playerId', 'forged');
  assert.equal((await exports.remotePortalAuthentication('http://backend.internal:3000', 'login-global', form)).redirectTo, '/portal');
  assert.equal(writes.length, 1); assert.equal(writes[0].value, issued); assert.equal(writes[0].secure, true); assert.equal(writes[0].httpOnly, true);
  invalidCookie = true;
  await assert.rejects(exports.remotePortalAuthentication('http://backend.internal:3000', 'login-global', form), /Unexpected authentication cookie/);
  assert.equal(writes.length, 1, 'invalid response must not partially overwrite the browser session');
  assert.equal(calls, 2);
});
