import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { registerArenaSchema } from "../src/lib/validators/auth";
import { defaultArenaPermissionProfiles, defaultPermissionsForRole } from "../src/lib/permissions";
import { agencyBillingDay } from "../src/lib/finance/agency-billing-dates";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("cadastro cria trial, perfis e owner na arena correta sem persistir dados do teste", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback do cadastro de arena de teste");
  const email = "goal-arena-registration@example.test";
  const sessions: string[] = [];
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      assert.equal(await tx.user.count({ where: { email } }), 0);
      const exports: Record<string, (...args: any[]) => Promise<any>> = {};
      const mocks: Record<string, unknown> = {
        bcryptjs: { hash: async () => "hash-descartavel" },
        "next/navigation": { redirect: (path: string) => { throw new Error(`redirect:${path}`); } },
        "@/lib/prisma": { prisma: { user: tx.user, arena: tx.arena, $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) } },
        "@/lib/auth/session": { createSession: async (id: string) => { sessions.push(id); } },
        "@/lib/env": { env: {} },
        "@/lib/auth/login-attempts": { activeLoginLock: async () => null, recordFailedLogin: async () => null, clearLoginFailures: async () => {} },
        "@/lib/validators/auth": { registerArenaSchema },
        "@/lib/permissions": { defaultArenaPermissionProfiles, defaultPermissionsForRole },
        "@/lib/finance/agency-billing-dates": { agencyBillingDay },
      };
      const source = readFileSync(new URL("../src/lib/auth/actions.ts", import.meta.url), "utf8");
      vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
        exports, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; }, FormData, Date, URL, console,
      });
      const form = new FormData();
      form.set("arenaName", "Arena Cadastro GOAL"); form.set("ownerName", "Responsável GOAL"); form.set("email", email);
      form.set("password", "SenhaDescartavel123!"); form.set("confirmPassword", "SenhaDescartavel123!");
      await assert.rejects(exports.registerArenaAction({ error: null }, form), /redirect:\/painel/);
      assert.equal(sessions.length, 1);
      const owner = await tx.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
      assert.equal(sessions[0], owner.id);
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-cadastro-goal" }, select: { id: true } });
      const member = await tx.arenaMember.findUniqueOrThrow({ where: { userId_arenaId: { userId: owner.id, arenaId: arena.id } }, select: { role: true, permissionProfile: { select: { name: true } } } });
      assert.equal(member.role, "OWNER");
      assert.equal(member.permissionProfile?.name, "Administrador");
      assert.equal(await tx.permissionProfile.count({ where: { arenaId: arena.id } }), defaultArenaPermissionProfiles.length);
      const subscription = await tx.agencySubscription.findUniqueOrThrow({ where: { arenaId: arena.id }, select: { planId: true, trialEndsAt: true, startsAt: true } });
      assert.equal(subscription.planId, "agency-trial-7-days");
      assert.ok(subscription.trialEndsAt);
      assert.equal(subscription.trialEndsAt!.getTime() - subscription.startsAt.getTime(), 7 * 24 * 60 * 60_000);
      throw rollback;
    }), (error: unknown) => error === rollback);
    assert.equal(await db.user.count({ where: { email } }), 0);
    assert.equal(await db.arena.count({ where: { slug: "arena-cadastro-goal" } }), 0);
  } finally {
    await db.$disconnect();
  }
});
