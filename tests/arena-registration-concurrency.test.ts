import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/auth/actions.ts", import.meta.url), "utf8");

function registration(overrides: { conflicts?: Array<{ code: string; meta: { target: string[] } }>; trial?: boolean; occupied?: string[] } = {}) {
  const conflicts = [...(overrides.conflicts ?? [])];
  const slugs: string[] = [];
  const sessions: string[] = [];
  let createdUsers = 0;
  const tx = {
    agencyPlan: { findUnique: async () => overrides.trial === false ? null : { id: "agency-trial-7-days" } },
    user: { create: async () => { createdUsers += 1; return { id: "owner-goal" }; } },
    arena: { create: async ({ data }: { data: { slug: string } }) => { slugs.push(data.slug); return { id: "arena-goal" }; } },
    agencySubscription: { create: async () => ({}) },
    permissionProfile: { createMany: async () => ({}), findUniqueOrThrow: async () => ({ id: "admin-profile" }) },
    arenaMember: { create: async () => ({}) },
  };
  const prisma = {
    user: { findUnique: async () => null },
    arena: { findUnique: async ({ where }: { where: { slug: string } }) => overrides.occupied?.includes(where.slug) ? { id: "existing" } : null },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
      const conflict = conflicts.shift();
      if (conflict) throw conflict;
      return callback(tx);
    },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const mocks: Record<string, unknown> = {
    bcryptjs: { hash: async () => "hash" },
    "next/navigation": { redirect: (path: string) => { throw new Error(`redirect:${path}`); } },
    "@/lib/prisma": { prisma },
    "@/lib/auth/session": { createSession: async (id: string) => { sessions.push(id); } },
    "@/lib/env": { env: {} },
    "@/lib/auth/login-attempts": { activeLoginLock: async () => null, recordFailedLogin: async () => null, clearLoginFailures: async () => {} },
    "@/lib/validators/auth": { registerArenaSchema: { safeParse: (data: unknown) => ({ success: true, data }) } },
    "@/lib/permissions": { defaultArenaPermissionProfiles: [], defaultPermissionsForRole: () => ({ viewPermissions: [], editPermissions: [] }) },
    "@/lib/finance/agency-billing-dates": { agencyBillingDay: () => 1 },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; }, FormData, Date, URL, console,
  });
  const data = new FormData();
  data.set("arenaName", "Arena Prova"); data.set("ownerName", "Responsável GOAL"); data.set("email", "goal-registration@example.test");
  data.set("password", "SenhaDescartavel123!"); data.set("confirmPassword", "SenhaDescartavel123!");
  return { action: () => exports.registerArenaAction({ error: null }, data), slugs, sessions, get createdUsers() { return createdUsers; } };
}

test("cadastro tenta outro slug se uma arena concorrente obtiver o primeiro", async () => {
  const flow = registration({ conflicts: [{ code: "P2002", meta: { target: ["slug"] } }] });
  await assert.rejects(flow.action(), /redirect:\/painel/);
  assert.deepEqual(flow.slugs, ["arena-prova-2"]);
  assert.deepEqual(flow.sessions, ["owner-goal"]);
});

test("cadastro usa sufixo 2 quando slug já existe", async () => {
  const flow = registration({ occupied: ["arena-prova"] });
  await assert.rejects(flow.action(), /redirect:\/painel/);
  assert.deepEqual(flow.slugs, ["arena-prova-2"]);
});

test("cadastro informa e-mail concorrente sem criar sessão", async () => {
  const flow = registration({ conflicts: [{ code: "P2002", meta: { target: ["email"] } }] });
  assert.match((await flow.action()).error, /Já existe uma conta/);
  assert.deepEqual(flow.sessions, []);
});

test("cadastro sem plano trial não cria usuário nem sessão", async () => {
  const flow = registration({ trial: false });
  assert.match((await flow.action()).error, /plano de avaliação/);
  assert.equal(flow.createdUsers, 0);
  assert.deepEqual(flow.sessions, []);
});
