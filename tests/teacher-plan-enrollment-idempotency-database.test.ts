import { lessonCreditState } from "../src/lib/academy/lesson-credits";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { lockClassGroupCapacity } from "../src/lib/academy/class-group-capacity";
import { lockStudentPlanSubscription } from "../src/lib/academy/subscription-lock";
import { planRecurrenceOwnerWhere } from "../src/lib/academy/plan-recurrence-owner";
import { getDiscountedAmountCents } from "../src/lib/finance/discounts";
import { getNextFinancialRecurrenceDate } from "../src/lib/finance/recurrences";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("duas inscrições no mesmo plano geram uma assinatura e doze lançamentos, sem afetar outra arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: { teacher?: string; plan?: string; group?: string; client?: string; betaClient?: string; paidClient?: string; bank?: string } = {};
  let issuedCharges = 0;
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const suffix = randomUUID();
    const teacher = await admin.teacher.create({ data: { arenaId: arenaA.id, name: `Professor Inscrição GOAL ${suffix}` }, select: { id: true } });
    ids.teacher = teacher.id;
    const plan = await admin.plan.create({ data: { arenaId: arenaA.id, name: `Plano Inscrição GOAL ${suffix}`, monthlyPriceCents: 30000, classesPerMonth: 4 }, select: { id: true } });
    ids.plan = plan.id;
    await admin.teacherPlan.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, planId: plan.id, monthlyPriceCents: 30000 } });
    const group = await admin.classGroup.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, name: `Turma Inscrição GOAL ${suffix}` }, select: { id: true } });
    ids.group = group.id;
    await admin.classGroupSchedule.create({ data: { arenaId: arenaA.id, classGroupId: group.id, weekday: 1, startTime: "08:00", capacity: 2 } });
    await admin.classGroupPlan.create({ data: { classGroupId: group.id, planId: plan.id } });
    const client = await admin.player.create({ data: { arenaId: arenaA.id, name: `Cliente Inscrição GOAL ${suffix}` }, select: { id: true } });
    ids.client = client.id;
    const betaClient = await admin.player.create({ data: { arenaId: arenaB.id, name: `Cliente Beta Inscrição GOAL ${suffix}` }, select: { id: true } });
    ids.betaClient = betaClient.id;

    const source = readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void | { error: string }>> = {};
    const nodeRequire = createRequire(import.meta.url);
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arenaA.id }), requirePermission: async (key: string) => { assert.equal(key, "finance:receivable:settle"); return { arenaId: arenaA.id }; } },
      "@/lib/academy/lesson-credits": { lessonCreditState },
      "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount },
      "@/lib/finance/discounts": { getDiscountedAmountCents },
      "@/lib/finance/recurrences": { getNextFinancialRecurrenceDate },
      "@/lib/payments/recurring-online-charges": { issueRecurringOnlineChargeForEntry: async () => { issuedCharges += 1; } },
      "@/lib/academy/class-group-capacity": { lockClassGroupCapacity },
      "@/lib/academy/subscription-lock": { lockStudentPlanSubscription },
      "@/lib/academy/plan-recurrence-owner": { planRecurrenceOwnerWhere },
      "@/lib/academy/inputs": { parseMoneyToCents: () => 0 },
      "@/lib/academy/revalidation": { refreshAcademyRoutes() {} },
      "@/lib/arena-database": { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) },
      "@/lib/prisma": { prisma: admin },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Date, FormData, console,
      require: (name: string) => name in mocks ? mocks[name] : name.startsWith("@/") ? {} : nodeRequire(name),
    });
    const enroll = (clientId: string) => {
      const form = new FormData();
      form.set("teacherId", teacher.id);
      form.set("planId", plan.id);
      form.set("clientId", clientId);
      form.set("classGroupId", group.id);
      form.set("startedAt", "2030-01-01");
      form.set("dueDay", "10");
      form.set("remainingClasses", "4");
      form.set("discount", "0");
      return exports.assignTeacherPlanStudentAction(form);
    };

    const results = await Promise.allSettled([enroll(client.id), enroll(client.id)]);
    assert.equal(results.filter(result => result.status === "rejected").length, 0);
    const outcomes = results.map(result => result.status === "fulfilled" ? result.value : undefined);
    assert.equal(outcomes.filter(value => !value).length, 1);
    assert.equal(outcomes.find(value => value)?.error, "Este aluno já está inscrito neste plano.");
    const student = await admin.student.findUniqueOrThrow({ where: { playerId: client.id }, select: { id: true, totalClasses: true } });
    assert.equal(student.totalClasses, 0);
    assert.equal(await admin.studentSubscription.count({ where: { studentId: student.id, planId: plan.id, status: "ACTIVE" } }), 1);
    assert.equal(await admin.classGroupEnrollment.count({ where: { studentId: student.id, classGroupId: group.id, status: "ACTIVE" } }), 1);
    assert.equal(await admin.financialRecurrence.count({ where: { arenaId: arenaA.id, planId: plan.id, playerId: client.id, active: true } }), 1);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: arenaA.id, planId: plan.id, playerId: client.id } }), 12);
    const recurrence = await admin.financialRecurrence.findFirstOrThrow({ where: { arenaId: arenaA.id, planId: plan.id, playerId: client.id, active: true } });
    const lastEntry = await admin.financialEntry.findFirstOrThrow({ where: { recurrenceId: recurrence.id }, orderBy: { dueDate: "desc" }, select: { dueDate: true } });
    assert.equal(recurrence.endsAt?.getTime(), lastEntry.dueDate?.getTime());
    assert.ok(recurrence.nextDueDate > recurrence.endsAt!);
    assert.equal(issuedCharges, 1);

    const paidClient = await admin.player.create({ data: { arenaId: arenaA.id, name: `Aluno pago QA ${suffix}` } });
    ids.paidClient = paidClient.id;
    const bank = await admin.bankAccount.create({ data: { arenaId: arenaA.id, name: `Conta inscrição QA ${suffix}` } });
    ids.bank = bank.id;
    const paidForm = new FormData();
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    for (const [key,value] of Object.entries({ teacherId: teacher.id, planId: plan.id, clientId: paidClient.id, classGroupId: group.id, startedAt: today, dueDate: today, paid: "on", paidAt: today, paymentMethod: "PIX", bankAccountId: bank.id, discount: "0" })) paidForm.set(key,value);
    await exports.assignTeacherPlanStudentAction(paidForm);
    const paidStudent = await admin.student.findUniqueOrThrow({ where: { playerId: paidClient.id } });
    assert.equal(paidStudent.remainingClasses, 4);
    const paidEntry = await admin.financialEntry.findFirstOrThrow({ where: { playerId: paidClient.id, planId: plan.id, status: "PAID" }, include: { settlements: true } });
    assert.equal(paidEntry.bankAccountId, bank.id);
    assert.equal(paidEntry.paidAt?.toISOString().slice(0,10), today);
    assert.equal(paidEntry.settlements.length, 1);
    assert.equal(paidEntry.settlements[0].amountCents, 30000);
    assert.equal(await admin.financialEntry.count({ where: { playerId: paidClient.id, planId: plan.id, status: "PENDING" } }), 11);
    assert.equal(await admin.lessonCreditBatch.count({ where: { studentId: paidStudent.id, granted: 4 } }), 1);
    assert.equal(issuedCharges, 1, "matrícula paga não emite um novo boleto");
    const pixRecurrence=await admin.financialRecurrence.findFirstOrThrow({where:{playerId:paidClient.id,planId:plan.id}});
    assert.equal(pixRecurrence.onlinePaymentMethod,"");
    const pixBills=await admin.financialEntry.findMany({where:{recurrenceId:pixRecurrence.id}});
    assert(pixBills.every(e=>e.paymentMethod==="PIX"&&e.bankAccountId===bank.id));

    const duplicateInFullGroup = await enroll(client.id);
    assert.equal(duplicateInFullGroup && duplicateInFullGroup.error, "Este aluno já está inscrito neste plano.");

    await assert.rejects(enroll(betaClient.id), /Professor, plano ou cliente não encontrado/);
    assert.equal(await admin.student.count({ where: { arenaId: arenaA.id, playerId: betaClient.id } }), 0);
  } finally {
    if (ids.plan) {
      await admin.financialEntry.deleteMany({ where: { planId: ids.plan } });
      await admin.financialRecurrence.deleteMany({ where: { planId: ids.plan } });
      await admin.studentSubscription.deleteMany({ where: { planId: ids.plan } });
    }
    if (ids.group) await admin.classGroup.delete({ where: { id: ids.group } });
    if (ids.plan) await admin.plan.delete({ where: { id: ids.plan } });
    if (ids.client) {
      await admin.student.deleteMany({ where: { playerId: ids.client } });
      await admin.player.delete({ where: { id: ids.client } });
    }
    if (ids.betaClient) await admin.player.delete({ where: { id: ids.betaClient } });
    if (ids.paidClient) { await admin.student.deleteMany({ where: { playerId: ids.paidClient } }); await admin.player.delete({ where: { id: ids.paidClient } }); }
    if (ids.bank) await admin.bankAccount.delete({ where: { id: ids.bank } });
    if (ids.teacher) await admin.teacher.delete({ where: { id: ids.teacher } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
