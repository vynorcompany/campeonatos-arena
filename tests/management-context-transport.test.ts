import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { managementContextResponseSchema } from '../src/lib/backend/contracts/management-context';

const source = readFileSync(new URL('../src/lib/backend/management-context-client.ts', import.meta.url), 'utf8');
test('management transport forwards only the configured session and arena cookies', async () => {
  const reads: string[] = [], calls: any[][] = [];
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const modules: Record<string, unknown> = {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: (name: string) => { reads.push(name); return { value: name === 'staff_session' ? 'synthetic-token' : 'arena;forged=value' }; } }) },
    '@/lib/backend/contracts/management-context': { managementContextResponseSchema },
    '@/lib/backend/http-client': { readBackendContract: async (...args: any[]) => { calls.push(args); return { auth: null, redirectTo: '/login' }; } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, process: { env: { SESSION_COOKIE_NAME: 'staff_session', ARENA_COOKIE_NAME: 'selected_arena' } },
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
  });
  await exports.readManagementContext('http://backend.internal:3000', true);
  assert.deepEqual(reads, ['staff_session', 'selected_arena']);
  assert.equal(calls[0][1], '/api/management/context?access=arena');
  assert.equal(calls[0][3].cookie, 'staff_session=synthetic-token; selected_arena=arena%3Bforged%3Dvalue');
});

test('management context contract rejects credentials, forged roles and inconsistent denials', () => {
  const auth = { userId: 'staff', userName: 'Staff', userEmail: 'staff@example.invalid', systemRole: 'VIEWER', arenaRole: 'STAFF', arenaId: 'arena-a', arenaName: 'Arena A', viewPermissions: ['dashboard'], editPermissions: [], memberships: [] };
  assert.equal(managementContextResponseSchema.safeParse({ auth, redirectTo: null }).success, true);
  assert.equal(managementContextResponseSchema.safeParse({ auth: { ...auth, passwordHash: 'private' }, redirectTo: null }).success, false);
  assert.equal(managementContextResponseSchema.safeParse({ auth: { ...auth, systemRole: 'ROOT' }, redirectTo: null }).success, false);
  assert.equal(managementContextResponseSchema.safeParse({ auth, redirectTo: '/acesso-indisponivel' }).success, false);
  assert.equal(managementContextResponseSchema.safeParse({ auth: null, redirectTo: 'https://outside.invalid' }).success, false);
});
