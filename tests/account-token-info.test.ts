import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { accountTokenInfoInputSchema, accountTokenInfoSchema } from '../src/lib/backend/contracts/account-token-info';

const source = readFileSync(new URL('../src/lib/backend/services/account-token-info.ts', import.meta.url), 'utf8');
test('token presentation exposes only valid invitation data and hashes the bearer before lookup', async () => {
  let reads = 0;
  let state: any = { kind: 'INVITE', email: 'new@example.invalid', arenaId: 'arena-a', usedAt: null, expiresAt: new Date(Date.now() + 60000) };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const modules: Record<string, unknown> = {
    'server-only': {},
    '@/lib/backend/contracts/account-token-info': { accountTokenInfoInputSchema },
    '@/lib/auth/account-tokens': { hashAccountToken: (token: string) => { assert.equal(token, 'a'.repeat(64)); return 'hashed-token'; } },
    '@/lib/auth/database': { prisma: {
      accountActionToken: { findUnique: async ({ where }: any) => { reads++; assert.equal(where.tokenHash, 'hashed-token'); return state; } },
      arena: { findUnique: async ({ where }: any) => { assert.equal(where.id, 'arena-a'); return { name: 'Arena A' }; } },
      user: { findUnique: async () => ({ id: 'private-user-id' }) },
    } },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const valid = await exports.resolveAccountTokenInfo('INVITE', 'a'.repeat(64));
  assert.equal(JSON.stringify(valid), JSON.stringify({ valid: true, invitation: { email: 'new@example.invalid', arenaName: 'Arena A', existingUser: true } }));
  assert.equal(accountTokenInfoSchema.safeParse(valid).success, true);
  for (const change of [{ usedAt: new Date() }, { expiresAt: new Date(0) }, { kind: 'RESET' }]) {
    const original = state; state = { ...state, ...change };
    assert.equal((await exports.resolveAccountTokenInfo('INVITE', 'a'.repeat(64))).valid, false);
    state = original;
  }
  const before = reads;
  assert.equal((await exports.resolveAccountTokenInfo('INVITE', 'bad')).valid, false);
  assert.equal(reads, before);
  assert.equal(accountTokenInfoSchema.safeParse({ valid: true, invitation: { ...valid.invitation, userId: 'private-user-id' } }).success, false);
});
