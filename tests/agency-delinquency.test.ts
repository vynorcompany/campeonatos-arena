import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { agencyInvoiceDeadline } from "../src/lib/finance/agency-billing-dates";
import { teacherPlanCondition } from "../src/lib/finance/plan-filter";

const delinquencySource = readFileSync(new URL("../src/lib/finance/agency-delinquency.ts", import.meta.url), "utf8");
const sessionSource = readFileSync(new URL("../src/lib/auth/session.ts", import.meta.url), "utf8");

function loadDelinquency(graceDays: number | null, invoice: { id: string; dueAt: Date; checkoutUrl: string; period: string } | null) {
  const exports: Record<string, (arenaId: string, now: Date) => Promise<{ blocked: boolean; daysRemaining: number; id: string } | null>> = {};
  vm.runInNewContext(ts.transpileModule(delinquencySource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, Promise,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/finance/agency-billing-dates") return { agencyInvoiceDeadline };
      if (name === "@/lib/prisma") return { prisma: {
        agencyPaymentConnection: { findUnique: async () => ({ graceDays }) },
        agencyInvoice: { findFirst: async ({ where }: { where: { arenaId: string; status: string; dueAt: { lt: Date } } }) => {
          assert.equal(where.arenaId, "arena-a");
          assert.equal(where.status, "PENDING");
          return invoice && invoice.dueAt < where.dueAt.lt ? invoice : null;
        } },
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports.getAgencyDelinquency;
}

test("prazo de regularização começa no vencimento e respeita os dias da agência", () => {
  const dueAt = new Date("2026-09-20T15:00:00.000Z");
  assert.equal(agencyInvoiceDeadline(dueAt, 0).toISOString(), dueAt.toISOString());
  assert.equal(agencyInvoiceDeadline(dueAt, 7).toISOString(), "2026-09-27T15:00:00.000Z");
});

test("aviso antecede o bloqueio e a falta de fatura pendente libera o acesso", async () => {
  const dueAt = new Date("2026-09-20T15:00:00.000Z");
  const invoice = { id: "invoice-a", dueAt, checkoutUrl: "https://example.test/pay", period: "2026-09" };
  const delinquency = loadDelinquency(7, invoice);
  const before = await delinquency("arena-a", new Date("2026-09-25T15:00:00.000Z"));
  assert.equal(before?.blocked, false);
  assert.equal(before?.daysRemaining, 2);
  const after = await delinquency("arena-a", new Date("2026-09-27T15:00:01.000Z"));
  assert.equal(after?.blocked, true);
  assert.equal(after?.daysRemaining, 0);
  assert.equal(await loadDelinquency(7, null)("arena-a", new Date("2026-09-27T15:00:01.000Z")), null);
});

test("prazo de zero dias bloqueia após o vencimento, mas não sem regra configurada", async () => {
  const invoice = { id: "invoice-a", dueAt: new Date("2026-09-20T15:00:00.000Z"), checkoutUrl: "", period: "2026-09" };
  const now = new Date("2026-09-20T15:00:01.000Z");
  assert.equal((await loadDelinquency(0, invoice)("arena-a", now))?.blocked, true);
  assert.equal(await loadDelinquency(null, invoice)("arena-a", now), null);
});

test("painel bloqueia arena inadimplente e libera após a fatura ser regularizada", async () => {
  let blocked = true;
  const exports: Record<string, () => Promise<{ arenaId: string }>> = {};
  const membership = { arenaId: "arena-a", role: "OWNER", viewPermissions: [], editPermissions: [], arena: { id: "arena-a", name: "Arena A", logoUrl: "" }, permissionProfile: null };
  vm.runInNewContext(ts.transpileModule(sessionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date,
    require: (name: string) => {
      if (name === "react") return { cache: (callback: unknown) => callback };
      if (name === "next/headers") return { cookies: async () => ({ get: (key: string) => key === "session" ? { value: "token" } : key === "arena" ? { value: "arena-a" } : undefined }) };
      if (name === "next/navigation") return { redirect: (path: string) => { throw new Error(`redirect:${path}`); } };
      if (name === "@/lib/env") return { env: { sessionTtlDays: 30, sessionCookieName: "session", arenaCookieName: "arena" } };
      if (name === "@/lib/prisma") return { prisma: {
        session: { findUnique: async () => ({ expiresAt: new Date(Date.now() + 60_000), user: { id: "user-a", name: "Operador", email: "operator@example.test", systemRole: "VIEWER", memberships: [membership] } }) },
        arena: { findUnique: async () => ({ accountStatus: "ACTIVE", agencySubscription: { status: "ACTIVE", trialEndsAt: null, plan: { isTrial: false } } }) },
      } };
      if (name === "@/lib/permissions") return { allPermissionModules: [] };
      if (name === "node:crypto") return { createHash: () => ({ update: () => ({ digest: () => "hash" }) }) };
      if (name === "@/lib/finance/agency-delinquency") return { getAgencyDelinquency: async () => blocked ? { blocked: true } : null };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  await assert.rejects(exports.requireArenaAccess(), /redirect:\/acesso-indisponivel/);
  blocked = false;
  assert.equal((await exports.requireArenaAccess()).arenaId, "arena-a");
});

test("todos os planos do professor inclui lançamento direto e mensalidade recorrente", () => {
  const condition = teacherPlanCondition("teacher-1");
  assert.deepEqual(condition.OR[0], { plan: { teacherAssignments: { some: { teacherId: "teacher-1", active: true } } } });
  assert.deepEqual(condition.OR[1], { recurrence: { plan: { teacherAssignments: { some: { teacherId: "teacher-1", active: true } } } } });
});
