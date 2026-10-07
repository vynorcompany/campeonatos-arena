import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../scripts/runtime-server.mjs', import.meta.url), 'utf8');
const sandbox: any = { URL };
vm.runInNewContext(code.slice(code.indexOf('export function runtimeEnvironment'), code.indexOf('\nfunction start')).replace('export function', 'function') + '\nthis.runtimeEnvironment=runtimeEnvironment;', sandbox);
test('web environment only inherits the limited database credential', () => {
  const environment = sandbox.runtimeEnvironment({ APP_DATABASE_URL: 'postgresql://arena_runtime:fixture@private/arena', DATABASE_URL: 'postgresql://postgres:admin@private/arena', DIRECT_URL: 'admin', PGPASSWORD: 'admin', PGUSER: 'postgres', PORT: '8080' });
  assert.equal(environment.DATABASE_URL, environment.APP_DATABASE_URL);
  assert.equal(environment.PORT,'8080');
  assert.equal(environment.HOSTNAME,'0.0.0.0');
  assert.equal(environment.DIRECT_URL,undefined);
  assert.equal(environment.PGPASSWORD,undefined);
  assert.equal(environment.PGUSER,undefined);
});
test('web startup rejects missing or administrative connections', () => {
  for(const APP_DATABASE_URL of [undefined,'postgresql://postgres:fixture@private/arena','https://arena_runtime:fixture@example.test']) assert.throws(() => sandbox.runtimeEnvironment({ APP_DATABASE_URL }));
});
