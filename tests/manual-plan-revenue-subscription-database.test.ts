import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { lockStudentPlanSubscription } from "../src/lib/academy/subscription-lock";
import { assertFinancialEntryRelationsBelongToArena } from "../src/lib/finance/entry-relations";
import { financialEntryPermission } from "../src/lib/finance/entry-permissions";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("receitas manuais simultâneas do mesmo plano criam apenas uma assinatura na arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: { teacher?: string; plan?: string; client?: string; betaClient?: string } = {};
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const suffix = randomUUID();
    ids.teacher = (await admin.teacher.create({ data: { arenaId: arenaA.id, name: `Professor Receita GOAL ${suffix}` }, select: { id: true } })).id;
    ids.plan = (await admin.plan.create({ data: { arenaId: arenaA.id, name: `Plano Receita GOAL ${suffix}`, monthlyPriceCents: 30000, classesPerMonth: 4 }, select: { id: true } })).id;
    await admin.teacherPlan.create({ data: { arenaId: arenaA.id, teacherId: ids.teacher, planId: ids.plan, monthlyPriceCents: 30000 } });
    ids.client = (await admin.player.create({ data: { arenaId: arenaA.id, name: `Cliente Receita GOAL ${suffix}` }, select: { id: true } })).id;
    ids.betaClient = (await admin.player.create({ data: { arenaId: arenaB.id, name: `Cliente Beta Receita GOAL ${suffix}` }, select: { id: true } })).id;

    const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
    const data = {
      type: "REVENUE", category: "Planos", description: "Mensalidade GOAL", counterpartyName: "Cliente GOAL",
      supplierId: "", bankAccountId: "", planId: ids.plan, productId: "", amount: "300,00", discount: "0",
      discountMode: "VALUE", paymentMethod: "PIX", status: "PENDING", dueDate: "2030-01-10", paidAt: "", notes: "",
    };
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arenaA.id }) },
      "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId: arenaA.id }) },
      "@/lib/permissions": { canPerformPermission: () => true },
      "@/lib/finance/entry-permissions": { financialEntryPermission },
      "@/lib/finance/action-schemas": { entrySchema: { safeParse: () => ({ success: true, data }) } },
      "@/lib/finance/inputs": { parseMoneyToCents: () => 30000, parseDate: (value: string) => value ? new Date(`${value}T12:00:00Z`) : null },
      "@/lib/finance/discounts": { getDiscountedAmountCents: () => 30000 },
      "@/lib/finance/entry-relations": { assertFinancialEntryRelationsBelongToArena },
      "@/lib/academy/subscription-lock": { lockStudentPlanSubscription },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, Date, FormData,
      require: (name: string) => mocks[name] ?? {},
    });
    const create = (clientId: string) => {
      const form = new FormData();
      form.set("clientId", clientId);
      form.set("teacherId", ids.teacher!);
      return exports.createFinancialEntryAction(form);
    };

    await Promise.all([create(ids.client), create(ids.client)]);
    const student = await admin.student.findUniqueOrThrow({ where: { playerId: ids.client }, select: { id: true } });
    assert.equal(await admin.financialEntry.count({ where: { arenaId: arenaA.id, planId: ids.plan, playerId: ids.client } }), 2);
    assert.equal(await admin.studentSubscription.count({ where: { arenaId: arenaA.id, studentId: student.id, planId: ids.plan, status: "ACTIVE" } }), 1);
    assert.equal(await admin.teacherStudent.count({ where: { arenaId: arenaA.id, studentId: student.id, teacherId: ids.teacher } }), 1);

    await assert.rejects(create(ids.betaClient), /Cliente não encontrado nesta arena/);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: arenaA.id, playerId: ids.betaClient } }), 0);
  } finally {
    if (ids.plan) {
      await admin.financialEntry.deleteMany({ where: { planId: ids.plan } });
      await admin.studentSubscription.deleteMany({ where: { planId: ids.plan } });
    }
    if (ids.client) {
      await admin.student.deleteMany({ where: { playerId: ids.client } });
      await admin.player.delete({ where: { id: ids.client } });
    }
    if (ids.betaClient) await admin.player.delete({ where: { id: ids.betaClient } });
    if (ids.plan) await admin.plan.delete({ where: { id: ids.plan } });
    if (ids.teacher) await admin.teacher.delete({ where: { id: ids.teacher } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
