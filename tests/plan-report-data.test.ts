import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadPlanReportData } from "../src/lib/reports/plan-report-data";

const period = { gte: new Date("2045-02-01T00:00:00.000Z"), lte: new Date("2045-02-28T23:59:59.999Z") };
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres"; }
  catch { return false; }
})();

test("plan report totals include subscriptions beyond the 250 displayed rows and honor payment filters", async () => {
  const records = Array.from({ length: 501 }, (_, index) => ({
    id: `subscription-${index}`,
    planId: "plan-a",
    status: "ACTIVE",
    monthlyPriceCents: 5_000,
    classesPerMonth: 4,
    createdAt: period.gte,
    plan: { name: "Individual" },
    student: { name: `Aluno ${index}`, playerId: null },
  }));
  const calls: Array<Record<string, unknown>> = [];
  const db = {
    studentSubscription: { findMany: async (query: Record<string, any>) => {
      calls.push(query);
      const start = query.cursor ? records.findIndex((record) => record.id === query.cursor.id) + 1 : 0;
      return records.slice(start, start + query.take);
    } },
    financialEntry: { findMany: async (query: Record<string, unknown>) => {
      assert.equal((query.where as Record<string, unknown>).arenaId, "arena-a");
      return [{ planId: "plan-a", playerId: null, counterpartyName: "Aluno 500", status: "PAID", dueDate: period.gte }];
    } },
  } as unknown as Parameters<typeof loadPlanReportData>[0];

  const all = await loadPlanReportData(db, "arena-a", period);
  assert.deepEqual([all.subscriptions.length, all.soldCount, all.activeCount, all.activeMonthlyCents], [250, 501, 501, 2_505_000]);
  assert.deepEqual(all.planSales, [{ label: "Individual", count: 501, total: 2_505_000 }]);
  assert.equal(all.monthlySales[0]?.count, 501);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].cursor, { id: "subscription-499" });
  assert.ok(calls.every((query) => (query.where as Record<string, unknown>).arenaId === "arena-a" && query.take === 500));

  calls.length = 0;
  const paid = await loadPlanReportData(db, "arena-a", period, { paymentFilter: "PAID", teacherId: "teacher-a" });
  assert.deepEqual([paid.subscriptions.length, paid.soldCount, paid.activeCount, paid.activeMonthlyCents], [1, 1, 1, 5_000]);
  assert.equal(paid.subscriptions[0]?.student.name, "Aluno 500");
  assert.deepEqual((calls[0].where as Record<string, any>).plan.teacherAssignments.some, { arenaId: "arena-a", teacherId: "teacher-a", active: true });
});

test("plan report pagination excludes another arena under the runtime tenant role", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback plan report fixture");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const prefix = `GOAL-${randomUUID()}`;
      const plan = await tx.plan.create({ data: { arenaId: arenaA.id, name: `${prefix}-plan` } });
      await tx.student.createMany({ data: Array.from({ length: 501 }, (_, index) => ({ arenaId: arenaA.id, name: `${prefix}-student-${index}` })) });
      const students = await tx.student.findMany({ where: { arenaId: arenaA.id, name: { startsWith: `${prefix}-student-` } }, select: { id: true, name: true } });
      await tx.studentSubscription.createMany({ data: students.map((student) => ({ arenaId: arenaA.id, studentId: student.id, planId: plan.id, status: "ACTIVE", monthlyPriceCents: 5_000, classesPerMonth: 4, createdAt: period.gte })) });
      const teacher = await tx.teacher.create({ data: { arenaId: arenaA.id, name: `${prefix}-teacher` } });
      await tx.teacherPlan.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, planId: plan.id, active: true } });
      await tx.financialEntry.create({ data: { arenaId: arenaA.id, planId: plan.id, type: "REVENUE", category: "GOAL", description: "Cobrança descartável", counterpartyName: students[0].name, amountCents: 5_000, status: "PAID", dueDate: period.gte } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignPlan = await tx.plan.create({ data: { arenaId: arenaB.id, name: `${prefix}-foreign-plan` } });
      const foreignStudent = await tx.student.create({ data: { arenaId: arenaB.id, name: `${prefix}-foreign-student` } });
      await tx.studentSubscription.create({ data: { arenaId: arenaB.id, studentId: foreignStudent.id, planId: foreignPlan.id, status: "ACTIVE", monthlyPriceCents: 99_900, createdAt: period.gte } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const scoped = tx as unknown as Parameters<typeof loadPlanReportData>[0];
      const report = await loadPlanReportData(scoped, arenaA.id, period);
      assert.deepEqual([report.subscriptions.length, report.soldCount, report.activeCount, report.activeMonthlyCents], [250, 501, 501, 2_505_000]);
      const teacherReport = await loadPlanReportData(scoped, arenaA.id, period, { teacherId: teacher.id });
      assert.equal(teacherReport.soldCount, 501);
      const paidReport = await loadPlanReportData(scoped, arenaA.id, period, { paymentFilter: "PAID" });
      assert.equal(paidReport.soldCount, 1);
      const foreign = await loadPlanReportData(scoped, arenaB.id, period);
      assert.equal(foreign.soldCount, 0);
      throw rollback;
    }, { timeout: 30_000 }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
