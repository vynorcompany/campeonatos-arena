import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { loginSchema } from "../src/lib/validators/auth";

const require = createRequire(import.meta.url);
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

function loadActions(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, Date, URL, URLSearchParams,
    require: (name: string) => name in mocks ? mocks[name] : require(name),
  });
  return exports;
}

test("colaborador redefine senha por link privado e entra, sem manter bloqueio ou sessões antigas", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da recuperação descartável");
  const email = `goal-recovery-${randomBytes(6).toString("hex")}@example.test`;
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const oldPassword = "SenhaAntiga123!";
      const newPassword = "SenhaNova123!";
      const user = await tx.user.create({ data: { name: "Colaborador de teste", email, passwordHash: await bcrypt.hash(oldPassword, 10), systemRole: "VIEWER" } });
      await tx.arenaMember.create({ data: { arenaId: arena.id, userId: user.id, role: "STAFF" } });
      await tx.session.create({ data: { userId: user.id, token: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 86_400_000) } });
      await tx.loginAttempt.create({ data: { email, failedCount: 5, lockedUntil: new Date(Date.now() + 900_000) } });

      const token = randomBytes(32).toString("hex");
      const hashAccountToken = (value: string) => createHash("sha256").update(value).digest("hex");
      const prisma = { ...tx, $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) };
      const recovery = loadActions("../src/lib/actions/account-access.ts", {
        "next/cache": { revalidatePath() {} },
        "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId: arena.id, arenaRole: "OWNER", systemRole: "VIEWER" }) },
        "@/lib/auth/account-email": { accountEmailIsConfigured: () => false, sendAccountEmail: async () => { throw new Error("E-mail não configurado"); } },
        "@/lib/auth/account-tokens": {
          hashAccountToken,
          createAccountToken: async (data: { kind: string; email: string; userId: string; hoursValid: number }) => ({ token, record: await tx.accountActionToken.create({ data: {
            tokenHash: hashAccountToken(token), kind: data.kind, email: data.email, userId: data.userId,
            expiresAt: new Date(Date.now() + data.hoursValid * 3_600_000),
          } }) }),
        },
        "@/lib/env": { env: { appUrl: "https://arena.example.test" } },
        "@/lib/prisma": { prisma },
        "@/lib/validators/user": { inviteArenaUserSchema: {} },
      });
      const requestForm = new FormData(); requestForm.set("userId", user.id);
      const issued = await recovery.sendArenaUserRecoveryAction({ error: null, success: null }, requestForm);
      assert.equal(issued.error, null);
      assert.match(issued.invitationUrl, /^https:\/\/arena\.example\.test\/redefinir-senha\?token=/);
      const resetForm = new FormData();
      resetForm.set("token", new URL(issued.invitationUrl).searchParams.get("token")!);
      resetForm.set("password", newPassword); resetForm.set("confirmPassword", newPassword);
      const reset = await recovery.completePasswordResetAction({ error: null, success: null }, resetForm);
      assert.equal(reset.error, null);
      assert.equal(await tx.session.count({ where: { userId: user.id } }), 0);
      assert.equal(await tx.loginAttempt.count({ where: { email } }), 0);
      assert.equal((await recovery.completePasswordResetAction({ error: null, success: null }, resetForm)).error, "Este link expirou ou já foi utilizado. Solicite outro.");

      let sessionsCreated = 0;
      const redirectSignal = new Error("redirect:/painel");
      const login = loadActions("../src/lib/auth/actions.ts", {
        "next/navigation": { redirect: () => { throw redirectSignal; } },
        "@/lib/prisma": { prisma: tx },
        "@/lib/auth/session": { createSession: async () => { sessionsCreated += 1; } },
        "@/lib/validators/auth": { loginSchema },
        "@/lib/permissions": {},
        "@/lib/finance/agency-billing-dates": {},
        "@/lib/auth/login-attempts": {
          activeLoginLock: async () => null,
          clearLoginFailures: async () => { await tx.loginAttempt.deleteMany({ where: { email } }); },
          recordFailedLogin: async () => null,
        },
      });
      const loginForm = new FormData(); loginForm.set("email", email); loginForm.set("password", oldPassword);
      assert.equal((await login.loginAction({ error: null }, loginForm)).error, "E-mail ou senha inválidos.");
      loginForm.set("password", newPassword);
      await assert.rejects(login.loginAction({ error: null }, loginForm), (error: unknown) => error === redirectSignal);
      assert.equal(sessionsCreated, 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
    assert.equal(await db.user.count({ where: { email } }), 0);
  } finally {
    await db.$disconnect();
  }
});
