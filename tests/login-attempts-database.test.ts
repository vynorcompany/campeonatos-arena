import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("falhas paralelas de login são contadas e bloqueadas atomicamente", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const key = `goal-login-${Date.now()}@example.test`;
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const source = readFileSync(new URL("../src/lib/auth/login-attempts.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/env") return { env: { loginMaxAttempts: 5, loginLockMinutes: 15 } };
      if (name === "@/lib/prisma") return { prisma: db };
      throw new Error(`Unexpected import: ${name}`);
    },
    Date,
  });
  try {
    const results = await Promise.all(Array.from({ length: 5 }, () => exports.recordFailedLogin(key)));
    const attempt = await db.loginAttempt.findUniqueOrThrow({ where: { email: key } });
    assert.equal(attempt.failedCount, 5);
    assert.ok(attempt.lockedUntil && attempt.lockedUntil > new Date(), JSON.stringify({ count: attempt.failedCount, lockedUntil: attempt.lockedUntil, results }));
    assert.equal(results.filter(Boolean).length, 1);
    assert.ok(await exports.activeLoginLock(key));

    await db.loginAttempt.update({ where: { email: key }, data: { lockedUntil: new Date(Date.now() - 60_000) } });
    assert.equal(await exports.recordFailedLogin(key), null);
    const afterExpiry = await db.loginAttempt.findUniqueOrThrow({ where: { email: key } });
    assert.equal(afterExpiry.failedCount, 1);
    assert.equal(afterExpiry.lockedUntil, null);

    await db.loginAttempt.update({ where: { email: key }, data: { failedCount: 4, updatedAt: new Date(Date.now() - 16 * 60_000) } });
    assert.equal(await exports.recordFailedLogin(key), null);
    const afterQuietPeriod = await db.loginAttempt.findUniqueOrThrow({ where: { email: key } });
    assert.equal(afterQuietPeriod.failedCount, 1, "tentativas antigas não devem bloquear um login isolado");
    assert.equal(afterQuietPeriod.lockedUntil, null);
    await exports.clearLoginFailures(key);
    assert.equal(await db.loginAttempt.count({ where: { email: key } }), 0);
  } finally {
    await db.loginAttempt.deleteMany({ where: { email: key } });
    await db.$disconnect();
  }
});
