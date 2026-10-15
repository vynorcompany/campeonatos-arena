import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import bcrypt from "bcryptjs";
import ts from "typescript";
import { loginSchema } from "../src/lib/validators/auth";

const require = createRequire(import.meta.url);

function loginFixture(passwordHash: string) {
  const redirectSignal = new Error("redirect");
  let sessionsCreated = 0;
  let failures = 0;
  const exports: Record<string, (state: { error: string | null }, form: FormData) => Promise<{ error: string | null }>> = {};
  const source = readFileSync(new URL("../src/lib/auth/actions.ts", import.meta.url), "utf8");
  const mocks: Record<string, unknown> = {
    "next/navigation": { redirect: () => { throw redirectSignal; } },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ id: "legacy-user", passwordHash, systemRole: "VIEWER" }) } } },
    "@/lib/auth/session": { createSession: async () => { sessionsCreated += 1; } },
    "@/lib/validators/auth": { loginSchema },
    "@/lib/permissions": {},
    "@/lib/finance/agency-billing-dates": {},
    "@/lib/auth/login-attempts": {
      activeLoginLock: async () => null,
      clearLoginFailures: async () => {},
      recordFailedLogin: async () => { failures += 1; return null; },
    },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports,
    require: (name: string) => name in mocks ? mocks[name] : require(name),
  });
  return { action: exports.loginAction, redirectSignal, state: () => ({ sessionsCreated, failures }) };
}

test("login confere pelo hash uma senha legada curta sem criar falha", async () => {
  const legacyPassword = "senha6";
  const fixture = loginFixture(await bcrypt.hash(legacyPassword, 10));
  const form = new FormData();
  form.set("email", " pessoa@arena.test ");
  form.set("password", legacyPassword);
  await assert.rejects(fixture.action({ error: null }, form), (error: unknown) => error === fixture.redirectSignal);
  assert.deepEqual(fixture.state(), { sessionsCreated: 1, failures: 0 });
});

test("senha errada continua recusada e registrada", async () => {
  const fixture = loginFixture(await bcrypt.hash("senha6", 10));
  const form = new FormData();
  form.set("email", "pessoa@arena.test");
  form.set("password", "errada");
  assert.equal((await fixture.action({ error: null }, form)).error, "E-mail ou senha inválidos.");
  assert.deepEqual(fixture.state(), { sessionsCreated: 0, failures: 1 });
});
