import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { lockStudentPlanSubscription } from "../src/lib/academy/subscription-lock";
import { planRecurrenceOwnerWhere } from "../src/lib/academy/plan-recurrence-owner";
import { paymentSchema, subscriptionSchema } from "../src/lib/finance/action-schemas";
import { getReferenceMonthRange, parseDate, parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { getNextFinancialRecurrenceDate } from "../src/lib/finance/recurrences";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("renovação cria novo ciclo de 12 sem apagar mensalidades anteriores nem cancelar outro plano", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: { plans: string[]; checkout?: string; player?: string; student?: string; betaStudent?: string; betaPlayer?: string } = { plans: [] };
  let chargeAttempts = 0;
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const suffix = randomUUID();
    for (const name of ["Principal", "Adicional"]) {
      const plan = await admin.plan.create({ data: { arenaId: arenaA.id, name: `Plano ${name} Renovação GOAL ${suffix}`, monthlyPriceCents: 30000, classesPerMonth: 4 }, select: { id: true } });
      ids.plans.push(plan.id);
    }
    ids.player = (await admin.player.create({ data: { arenaId: arenaA.id, name: `Cliente Renovação GOAL ${suffix}` }, select: { id: true } })).id;
    ids.student = (await admin.student.create({ data: { arenaId: arenaA.id, playerId: ids.player, name: `Aluno Renovação GOAL ${suffix}` }, select: { id: true } })).id;
    ids.betaPlayer = (await admin.player.create({ data: { arenaId: arenaB.id, name: `Cliente Beta Renovação GOAL ${suffix}` }, select: { id: true } })).id;
    ids.betaStudent = (await admin.student.create({ data: { arenaId: arenaB.id, playerId: ids.betaPlayer, name: `Aluno Beta Renovação GOAL ${suffix}` }, select: { id: true } })).id;

    const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arenaA.id }) },
      "@/lib/finance/action-schemas": { paymentSchema, subscriptionSchema },
      "@/lib/finance/inputs": { getReferenceMonthRange, parseDate, parseMoneyToCents },
      "@/lib/finance/ledger": { getFinancialEntryBalance },
      "@/lib/finance/recurrences": { getNextFinancialRecurrenceDate },
      "@/lib/academy/subscription-lock": { lockStudentPlanSubscription },
      "@/lib/academy/plan-recurrence-owner": { planRecurrenceOwnerWhere },
      "@/lib/payments/recurring-online-charges": { issueRecurringOnlineChargeForEntry: async () => { chargeAttempts += 1; } },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
      "@/lib/prisma": { prisma: admin },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, Date, FormData, console,
      require: (name: string) => mocks[name] ?? {},
    });
    const activate = (studentId: string, planId: string, startedAt = "") => {
      const form = new FormData();
      form.set("studentId", studentId);
      form.set("planId", planId);
      form.set("dueDay", "10");
      form.set("startedAt", startedAt);
      form.set("notes", "Teste fictício de renovação");
      return exports.createSubscriptionAction(form);
    };
    const recordPayment = (subscriptionId: string, referenceMonth: string, amount = "") => {
      const form = new FormData();
      form.set("subscriptionId", subscriptionId);
      form.set("referenceMonth", referenceMonth);
      form.set("amount", amount);
      form.set("paidAt", "");
      form.set("paymentMethod", "PIX");
      form.set("fiscalDocumentType", "");
      return exports.recordPlanPaymentAction(form);
    };

    const today = new Date();
    const oldStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate() - 1, 12).toISOString().slice(0, 10);
    const newStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString().slice(0, 10);
    await activate(ids.student, ids.plans[0], oldStart);
    await activate(ids.student, ids.plans[1], newStart);
    const oldEntries = await admin.financialEntry.findMany({ where: { arenaId: arenaA.id, planId: ids.plans[0], playerId: ids.player }, select: { id: true, recurrenceId: true, dueDate: true }, orderBy: { dueDate: "asc" } });
    assert.equal(oldEntries.length, 12);
    const oldSubscription = await admin.studentSubscription.findFirstOrThrow({ where: { arenaId: arenaA.id, studentId: ids.student, planId: ids.plans[0], status: "ACTIVE" } });
    const referenceMonth = oldEntries[0].dueDate!.toISOString().slice(0, 7);
    await assert.rejects(recordPayment(oldSubscription.id, "2099-01"), /Não foi encontrada uma mensalidade única/);
    await assert.rejects(recordPayment(oldSubscription.id, referenceMonth, "400,00"), /até o saldo pendente/);
    await admin.financialEntry.update({ where: { id: oldEntries[0].id }, data: { onlinePaymentId: "boleto-ficticio" } });
    await assert.rejects(recordPayment(oldSubscription.id, referenceMonth), /cobrança online emitida/);
    await admin.financialEntry.update({ where: { id: oldEntries[0].id }, data: { onlinePaymentId: "" } });
    ids.checkout = (await admin.onlinePaymentCheckout.create({ data: {
      arenaId: arenaA.id, playerId: ids.player!, amountCents: 30000,
      mercadoPagoPaymentId: "checkout-ficticio", checkoutUrl: "https://example.invalid/checkout",
      items: { create: [{ financialEntryId: oldEntries[0].id, amountCents: 30000 }] },
    }, select: { id: true } })).id;
    await assert.rejects(recordPayment(oldSubscription.id, referenceMonth), /cobrança online emitida/);
    await admin.onlinePaymentCheckout.update({ where: { id: ids.checkout }, data: { status: "FAILED" } });
    await recordPayment(oldSubscription.id, referenceMonth, "100,00");
    let paidEntry = await admin.financialEntry.findUniqueOrThrow({ where: { id: oldEntries[0].id }, include: { settlements: true } });
    assert.equal(paidEntry.status, "PENDING");
    assert.equal(paidEntry.settlements.length, 1);
    assert.equal(getFinancialEntryBalance(paidEntry.amountCents, paidEntry.settlements).outstandingCents, 20000);
    await recordPayment(oldSubscription.id, referenceMonth);
    paidEntry = await admin.financialEntry.findUniqueOrThrow({ where: { id: oldEntries[0].id }, include: { settlements: true } });
    assert.equal(paidEntry.status, "PAID");
    assert.equal(paidEntry.settlements.length, 2);
    assert.equal(getFinancialEntryBalance(paidEntry.amountCents, paidEntry.settlements).outstandingCents, 0);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: arenaA.id, planId: ids.plans[0], playerId: ids.player } }), 12);
    await assert.rejects(recordPayment(oldSubscription.id, referenceMonth), /já foi quitada/);
    await activate(ids.student, ids.plans[0], newStart);
    const principalSubscriptions = await admin.studentSubscription.findMany({ where: { arenaId: arenaA.id, studentId: ids.student, planId: ids.plans[0] }, select: { status: true } });
    assert.equal(principalSubscriptions.filter(({ status }) => status === "ACTIVE").length, 1);
    assert.equal(principalSubscriptions.filter(({ status }) => status === "RENEWED").length, 1);
    assert.equal(await admin.studentSubscription.count({ where: { arenaId: arenaA.id, studentId: ids.student, planId: ids.plans[1], status: "ACTIVE" } }), 1);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: arenaA.id, planId: ids.plans[0], playerId: ids.player } }), 24);
    assert.equal(await admin.financialEntry.count({ where: { id: { in: oldEntries.map(({ id }) => id) } } }), 12);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: arenaA.id, planId: ids.plans[1], playerId: ids.player } }), 12);
    assert.equal(await admin.financialRecurrence.count({ where: { arenaId: arenaA.id, planId: ids.plans[0], playerId: ids.player, active: true } }), 1);
    assert.equal(await admin.financialRecurrence.count({ where: { arenaId: arenaA.id, planId: ids.plans[0], playerId: ids.player, active: false } }), 1);
    assert.equal(await admin.financialRecurrence.count({ where: { arenaId: arenaA.id, planId: ids.plans[0], studentId: ids.student } }), 2);
    assert.equal(chargeAttempts, 3);
    await assert.rejects(recordPayment(oldSubscription.id, referenceMonth), /Assinatura não encontrada/);

    await assert.rejects(activate(ids.student, ids.plans[0]), /a partir do aniversário de 12 meses/);
    await assert.rejects(activate(ids.betaStudent, ids.plans[0]), /Aluno não encontrado/);
    assert.equal(await admin.studentSubscription.count({ where: { arenaId: arenaB.id, studentId: ids.betaStudent } }), 0);
  } finally {
    if (ids.checkout) await admin.onlinePaymentCheckout.delete({ where: { id: ids.checkout } });
    if (ids.plans.length) {
      await admin.financialEntry.deleteMany({ where: { planId: { in: ids.plans } } });
      await admin.financialRecurrence.deleteMany({ where: { planId: { in: ids.plans } } });
      await admin.studentSubscription.deleteMany({ where: { planId: { in: ids.plans } } });
    }
    if (ids.student) await admin.student.delete({ where: { id: ids.student } });
    if (ids.player) await admin.player.delete({ where: { id: ids.player } });
    if (ids.betaStudent) await admin.student.delete({ where: { id: ids.betaStudent } });
    if (ids.betaPlayer) await admin.player.delete({ where: { id: ids.betaPlayer } });
    for (const planId of ids.plans) await admin.plan.delete({ where: { id: planId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
