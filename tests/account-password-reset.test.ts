import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import bcrypt from "bcryptjs";
import ts from "typescript";

const require = createRequire(import.meta.url);

function fixture() {
  const token = "a".repeat(64);
  const record = {
    id: "reset-1", kind: "RESET", userId: "member-1", email: "member@example.test",
    usedAt: null as Date | null, expiresAt: new Date(Date.now() + 30 * 60_000)
  };
  let passwordHash = "";
  let invalidatedSessions = 0;
  let clearedAttempts = 0;
  const prisma = {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
    accountActionToken: {
      findUnique: async () => record,
      updateMany: async () => {
        if (record.usedAt || record.expiresAt <= new Date()) return { count: 0 };
        record.usedAt = new Date();
        return { count: 1 };
      }
    },
    user: { update: async ({ data }: { data: { passwordHash: string } }) => { passwordHash = data.passwordHash; } },
    session: { deleteMany: async () => { invalidatedSessions += 1; } },
    loginAttempt: { deleteMany: async () => { clearedAttempts += 1; } }
  };
  const exports: Record<string, (...args: unknown[]) => Promise<{ error: string | null; success: string | null }>> = {};
  const source = readFileSync(new URL("../src/lib/actions/account-access.ts", import.meta.url), "utf8");
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/session": {},
    "@/lib/auth/account-email": {},
    "@/lib/auth/account-tokens": { hashAccountToken: () => "token-hash" },
    "@/lib/env": { env: { appUrl: "https://example.test" } },
    "@/lib/prisma": { prisma },
    "@/lib/validators/user": { inviteArenaUserSchema: {} }
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, URL, URLSearchParams, require: (name: string) => name in mocks ? mocks[name] : require(name)
  });
  const form = new FormData();
  form.set("token", token);
  form.set("password", "NovaSenhaSegura123!");
  form.set("confirmPassword", "NovaSenhaSegura123!");
  return {
    form, record, reset: () => exports.completePasswordResetAction({ error: null, success: null }, form),
    state: () => ({ passwordHash, invalidatedSessions, clearedAttempts })
  };
}

test("a recovery link resets the password once and invalidates sessions and login attempts", async () => {
  const f = fixture();
  const first = await f.reset();
  assert.equal(first.error, null);
  assert.match(first.success ?? "", /Senha redefinida/);
  assert.equal(await bcrypt.compare("NovaSenhaSegura123!", f.state().passwordHash), true);
  assert.equal(f.state().invalidatedSessions, 1);
  assert.equal(f.state().clearedAttempts, 1);

  const second = await f.reset();
  assert.match(second.error ?? "", /expirou ou já foi utilizado/);
  assert.equal(f.state().invalidatedSessions, 1);
});

test("expired recovery links cannot change the password", async () => {
  const f = fixture();
  f.record.expiresAt = new Date(Date.now() - 1);
  const result = await f.reset();
  assert.match(result.error ?? "", /expirou ou já foi utilizado/);
  assert.equal(f.state().passwordHash, "");
  assert.equal(f.state().invalidatedSessions, 0);
});
