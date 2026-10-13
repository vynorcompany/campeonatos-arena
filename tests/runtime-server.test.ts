import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../scripts/runtime-server.mjs', import.meta.url), 'utf8');
const sandbox: any = { URL };
vm.runInNewContext(code.slice(code.indexOf('export function runtimeEnvironment'), code.indexOf('\nfunction start')).replaceAll('export function', 'function') + '\nthis.runtimeEnvironment=runtimeEnvironment; this.runtimeWritableDirectories=runtimeWritableDirectories;', sandbox);
test('web environment only inherits the limited database credential', () => {
  const environment = sandbox.runtimeEnvironment({ APP_DATABASE_URL: 'postgresql://arena_runtime:fixture@private/arena', DATABASE_URL: 'postgresql://postgres:admin@private/arena', DIRECT_URL: 'admin', PGPASSWORD: 'admin', PGUSER: 'postgres', PORT: '8080' });
  assert.equal(environment.DATABASE_URL, environment.APP_DATABASE_URL);
  assert.equal(environment.PORT,'8080');
  assert.equal(environment.HOSTNAME,'0.0.0.0');
  assert.equal(environment.__NEXT_PRIVATE_ORIGIN,'http://127.0.0.1:8080');
  assert.equal(environment.DIRECT_URL,undefined);
  assert.equal(environment.PGPASSWORD,undefined);
  assert.equal(environment.PGUSER,undefined);
});
test('web runtime uses a valid local origin for redirected Server Actions', () => {
  const environment = sandbox.runtimeEnvironment({ APP_DATABASE_URL: 'postgresql://arena_runtime:fixture@private/arena', __NEXT_PRIVATE_ORIGIN: 'https://untrusted.example', PORT: '31337' });
  assert.equal(environment.__NEXT_PRIVATE_ORIGIN, 'http://127.0.0.1:31337');
  assert.equal(sandbox.runtimeEnvironment({ APP_DATABASE_URL: 'postgresql://arena_runtime:fixture@private/arena' }).__NEXT_PRIVATE_ORIGIN, 'http://127.0.0.1:3000');
  for (const PORT of ['0', '65536', 'not-a-port']) {
    assert.throws(() => sandbox.runtimeEnvironment({ APP_DATABASE_URL: 'postgresql://arena_runtime:fixture@private/arena', PORT }));
  }
});
test('web startup rejects missing or administrative connections', () => {
  for(const APP_DATABASE_URL of [undefined,'postgresql://postgres:fixture@private/arena','https://arena_runtime:fixture@example.test']) assert.throws(() => sandbox.runtimeEnvironment({ APP_DATABASE_URL }));
});
test('web runtime makes the actual Next cache paths writable before dropping privileges', () => {
  const directories: string[] = sandbox.runtimeWritableDirectories();
  assert.ok(directories.includes('.next/cache'));
  assert.ok(directories.includes('.next/server/route-cache'));
  assert.ok(!directories.includes('.next/standalone/.next/cache'));
});
test('web startup grants cache access before launching the limited process', () => {
  const events: string[] = [];
  let childOptions: { uid?: number; gid?: number } = {};
  const context = {
    URL,
    process: {
      env: { APP_DATABASE_URL: 'postgresql://arena_runtime:fixture@private/arena' },
      platform: 'linux', getuid: () => 0, setgroups: () => events.push('drop-groups'),
      execPath: '/usr/bin/node', on: () => undefined,
    },
    mkdirSync: (directory: string) => events.push(`mkdir:${directory}`),
    chownSync: (directory: string) => events.push(`chown:${directory}`),
    resolve: (path: string) => path,
    spawn: (_command: string, _args: string[], options: { uid?: number; gid?: number }) => {
      childOptions = options;
      events.push('spawn');
      return { on: () => undefined, kill: () => undefined };
    },
  };
  vm.runInNewContext(code.slice(code.indexOf('export function runtimeEnvironment'), code.indexOf('\nif (process.argv[1]')).replaceAll('export function', 'function') + '\nstart();', context);
  assert.ok(events.indexOf('mkdir:.next/server/route-cache') < events.indexOf('chown:.next/server/route-cache'));
  assert.ok(events.indexOf('chown:.next/server/route-cache') < events.indexOf('spawn'));
  assert.ok(events.indexOf('drop-groups') < events.indexOf('spawn'));
  assert.equal(childOptions.uid, 65534);
  assert.equal(childOptions.gid, 65534);
});
