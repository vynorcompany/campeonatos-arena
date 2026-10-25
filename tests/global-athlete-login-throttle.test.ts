import { legalVersion } from "../src/lib/legal/version";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function fixture() {
  const source = readFileSync(new URL("../src/lib/actions/player-auth.ts", import.meta.url), "utf8");
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const attempts = new Map<string, number>();
  const sessions: string[] = [];
  let lookups = 0;
  const mocks: Record<string, unknown> = {
    "@/lib/legal/version": { legalVersion },
    bcryptjs: { compare: async (password: string) => password === "SenhaCorreta123!" },
    "next/navigation": { redirect: (path: string) => { throw new Error(`redirect:${path}`); } },
    "@/lib/auth/player-session": { createPublicPlayerSession: async (id: string) => { sessions.push(id); }, destroyPublicPlayerSession: async () => {} },
    "@/lib/prisma": { prisma: {
      arena: { findUnique: async () => ({ id: "arena-goal" }) },
      playerAuthAttempt: { findUnique: async () => null, deleteMany: async () => ({ count: 0 }) },
      playerAccount: { findUnique: async () => ({ id: "account-goal", identityId: "identity-goal", passwordHash: "hash", player: { active: true } }) },
      athleteIdentity: { findUnique: async () => { lookups += 1; return { id: "identity-goal", passwordHash: "hash", accounts: [{ id: "account-goal", passwordHash: "hash" }] }; } },
    } },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (tx: any) => Promise<unknown>) => callback((mocks["@/lib/prisma"] as any).prisma) },
    "@/lib/services/public-client-registration": { resolvePublicClientPlayer: () => null },
    "@/lib/env": { env: {} },
    "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: async () => {} },
    "@/lib/phone": { normalizeBrazilianPhone: (value: string) => value.replace(/\D/g, "") },
    "@/lib/auth/login-attempts": {
      activeLoginLock: async (key: string) => (attempts.get(key) ?? 0) >= 5 ? new Date(Date.now() + 60_000) : null,
      recordFailedLogin: async (key: string) => { attempts.set(key, (attempts.get(key) ?? 0) + 1); },
      clearLoginFailures: async (key: string) => { attempts.delete(key); },
    },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, require: (name: string) => name in mocks ? mocks[name] : require(name), FormData, Date, URL, Buffer, console,
  });
  const login = (password: string) => {
    const form = new FormData(); form.set("phone", "(11) 97777-0042"); form.set("password", password);
    return exports.loginGlobalAthleteAction({ error: null }, form);
  };
  const loginArena = (password: string) => {
    const form = new FormData(); form.set("arenaSlug", "arena-goal"); form.set("returnTo", ""); form.set("phone", "(11) 97777-0042"); form.set("password", password);
    return exports.loginPublicClientAction({ error: null }, form);
  };
  return { login, loginArena, attempts, sessions, get lookups() { return lookups; } };
}

test("portal global limita palpites e não consulta identidade após bloqueio", async () => {
  const app = fixture();
  for (let i = 0; i < 5; i += 1) assert.match((await app.login("SenhaErrada123!")).error, /Telefone ou senha inválidos/);
  assert.equal(app.attempts.get("athlete:11977770042"), 5);
  assert.match((await app.login("SenhaCorreta123!")).error, /Muitas tentativas/);
  assert.equal(app.lookups, 5);
  assert.deepEqual(app.sessions, []);
});

test("portal global limpa falhas depois de autenticação correta", async () => {
  const app = fixture();
  assert.match((await app.login("SenhaErrada123!")).error, /Telefone ou senha inválidos/);
  await assert.rejects(app.login("SenhaCorreta123!"), /redirect:\/portal/);
  assert.equal(app.attempts.size, 0);
  assert.deepEqual(app.sessions, ["account-goal"]);
});

test("login da arena e login global compartilham o mesmo limite por telefone", async () => {
  const app = fixture();
  for (let i = 0; i < 5; i += 1) assert.match((await app.loginArena("SenhaErrada123!")).error, /Telefone ou senha inválidos/);
  assert.equal(app.attempts.get("athlete:11977770042"), 5);
  assert.match((await app.login("SenhaCorreta123!")).error, /Muitas tentativas/);
  assert.deepEqual(app.sessions, []);
});
