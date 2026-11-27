import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/lib/backend/services/account-access.ts', import.meta.url), 'utf8');

test('existing account accepts an invitation without password fields and keeps its credentials', async () => {
  let memberships = 0;
  const record = { kind: 'INVITE', id: 'invite', arenaId: 'arena-b', profileId: 'profile-b', arenaRole: 'STAFF', email: 'existing@example.invalid', usedAt: null as Date | null, expiresAt: new Date(Date.now() + 60000) };
  const db: any = {
    accountActionToken: { findUnique: async () => record, updateMany: async () => { if (record.usedAt) return { count: 0 }; record.usedAt = new Date(); return { count: 1 }; } },
    permissionProfile: { findFirst: async ({ where }: any) => { assert.equal(where.arenaId, 'arena-b'); return { id: 'profile-b', viewPermissions: ['dashboard'], editPermissions: [] }; } },
    user: { findUnique: async () => ({ id: 'existing-user' }), create: async () => { throw Error('Existing account must not be recreated'); }, update: async () => { throw Error('Existing password must not be replaced'); } },
    arenaMember: { upsert: async ({ where, create, update }: any) => { assert.equal(where.userId_arenaId.userId, 'existing-user'); assert.equal(create.arenaId, 'arena-b'); assert.deepEqual(Object.keys(update), []); memberships++; } },
  };
  db.$transaction = async (callback: any) => callback(db);
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const mocks: Record<string, unknown> = {
    '@/lib/auth/database': { prisma: db },
    '@/lib/auth/account-tokens': { hashAccountToken: () => 'hashed-token' },
    bcryptjs: { hash: async () => { throw Error('Existing password must not be rehashed'); } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, Date, URL, URLSearchParams, require: (name: string) => name in mocks ? mocks[name] : name.startsWith('@/') ? {} : require(name),
  });
  const form = new FormData(); form.set('token', 'a'.repeat(64));
  const result = await exports.acceptArenaInviteAction({ error: null, success: null }, form);
  assert.equal(result.error, null); assert.match(result.success, /senha atual/); assert.equal(memberships, 1);
  assert.ok((await exports.acceptArenaInviteAction({ error: null, success: null }, form)).error);
  assert.equal(memberships, 1);
});
