import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { publicPlayerContextSchema } from '../src/lib/backend/contracts/player-context';

const source = readFileSync(new URL('../src/lib/auth/player-session.ts', import.meta.url), 'utf8');
test('remote session read sends only the athlete cookie and never falls back on failure', async () => {
  let databaseReads = 0;
  let fail = false;
  const calls: unknown[][] = [];
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const modules: Record<string, unknown> = {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: (name: string) => { assert.equal(name, 'arena_player_session'); return { value: 'synthetic-token' }; } }) },
    '@/lib/backend/contracts/player-context': { publicPlayerContextSchema },
    '@/lib/backend/services/player-session': {
      getPublicPlayerContext: async () => { databaseReads++; throw Error('Local database must not be read'); },
    },
    '@/lib/backend/http-client': { readBackendContract: async (...args: unknown[]) => {
      calls.push(args);
      if (fail) throw Error('Backend unavailable');
      return { currentClient: null, athleteIdentity: null };
    } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, process: { env: { VX4_BACKEND_ORIGIN: 'http://backend.internal:3000' } },
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
  });
  await exports.getPublicPlayerContext('arena-a');
  assert.equal(calls[0][1], '/api/portal/session?arena=arena-a');
  assert.equal(JSON.stringify(calls[0][3]), JSON.stringify({ cookie: 'arena_player_session=synthetic-token' }));
  fail = true;
  await assert.rejects(exports.getPublicPlayerContext('arena-a'), /Backend unavailable/);
  assert.equal(databaseReads, 0);
});

test('session DTO rejects credential fields, even inside membership data', () => {
  assert.throws(() => publicPlayerContextSchema.parse({ currentClient: null, athleteIdentity: { id: null, phone: '', passwordHash: 'private', arenas: [] } }));
  assert.throws(() => publicPlayerContextSchema.parse({ currentClient: null, athleteIdentity: { id: null, phone: '', arenas: [{ slug: 'a', name: 'A', logoUrl: '', playerName: 'A', city: '', state: '', token: 'private' }] } }));
});
