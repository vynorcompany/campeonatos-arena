import { arenaDatabaseForTest } from "./helpers/arena-database";
import { registerLessonCheckin } from "../src/lib/checkin/lesson";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { getNextFinancialRecurrenceDate } from "../src/lib/finance/recurrences";
import { lockClassGroupCapacity } from "../src/lib/academy/class-group-capacity";
import { lockStudentPlanSubscription } from "../src/lib/academy/subscription-lock";
import { planRecurrenceOwnerWhere } from "../src/lib/academy/plan-recurrence-owner";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("aprovações simultâneas não duplicam matrícula nem cobrança e respeitam a arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: { group?: string; secondGroup?: string; thirdGroup?: string; plan?: string; player?: string; student?: string; secondPlayer?: string; secondStudent?: string; betaPlayer?: string; betaStudent?: string; betaRequest?: string } = {};
  let issuedCharges = 0;
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const teacher = await admin.teacher.findUniqueOrThrow({ where: { arenaId_name: { arenaId: arenaA.id, name: "Professora de Nome Comprido GOAL" } }, select: { id: true } });
    const suffix = randomUUID();
    const player = await admin.player.create({ data: { arenaId: arenaA.id, name: `Atleta Aprovação GOAL ${suffix}` }, select: { id: true, name: true } });
    ids.player = player.id;
    const student = await admin.student.create({ data: { arenaId: arenaA.id, playerId: player.id, name: player.name }, select: { id: true } });
    ids.student = student.id;
    const group = await admin.classGroup.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, name: `Turma Aprovação GOAL ${suffix}` }, select: { id: true } });
    ids.group = group.id;
    await admin.classGroupSchedule.create({ data: { arenaId: arenaA.id, classGroupId: group.id, weekday: 1, startTime: "08:00", capacity: 2 } });
    const plan = await admin.plan.create({ data: { arenaId: arenaA.id, name: `Plano Aprovação GOAL ${suffix}`, monthlyPriceCents: 25000, classesPerMonth: 4 }, select: { id: true } });
    ids.plan = plan.id;
    await admin.classGroupPlan.create({ data: { classGroupId: group.id, planId: plan.id } });
    const request = await admin.classGroupRequest.create({ data: { arenaId: arenaA.id, classGroupId: group.id, studentId: student.id }, select: { id: true } });

    const betaGroup = await admin.classGroup.findUniqueOrThrow({ where: { arenaId_name: { arenaId: arenaB.id, name: "Turma Exclusiva Outra Arena GOAL" } }, select: { id: true } });
    const betaPlayer = await admin.player.create({ data: { arenaId: arenaB.id, name: `Atleta Beta Aprovação GOAL ${suffix}` }, select: { id: true, name: true } });
    ids.betaPlayer = betaPlayer.id;
    const betaStudent = await admin.student.create({ data: { arenaId: arenaB.id, playerId: betaPlayer.id, name: betaPlayer.name }, select: { id: true } });
    ids.betaStudent = betaStudent.id;
    const betaRequest = await admin.classGroupRequest.create({ data: { arenaId: arenaB.id, classGroupId: betaGroup.id, studentId: betaStudent.id }, select: { id: true } });
    ids.betaRequest = betaRequest.id;

    const source = readFileSync(new URL("../src/lib/actions/class-groups.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const mocks: Record<string, unknown> = {
      "@/lib/checkin/lesson": { registerLessonCheckin },
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/player-session": {},
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arenaA.id }) },
      "@/lib/finance/recurrences": { getNextFinancialRecurrenceDate },
      "@/lib/calendar/court-slot-availability": {},
      "@/lib/calendar/arena-wall-clock": {},
      "@/lib/payments/recurring-online-charges": { issueRecurringOnlineChargeForEntry: async () => { issuedCharges += 1; } },
      "@/lib/academy/class-group-capacity": { lockClassGroupCapacity },
      "@/lib/academy/subscription-lock": { lockStudentPlanSubscription },
      "@/lib/arena-database": { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) },
      "@/lib/prisma": { prisma: admin },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Date, FormData, console,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Import inesperado: ${name}`); return mocks[name]; },
    });
    const approve = (requestId: string) => {
      const form = new FormData();
      form.set("requestId", requestId);
      form.set("planId", plan.id);
      form.set("startedAt", "2030-01-01");
      form.set("dueDay", "10");
      return exports.approveClassGroupRequestAction(form);
    };

    const results = await Promise.allSettled([approve(request.id), approve(request.id)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.find((result) => result.status === "rejected");
    assert.equal(rejected?.status, "rejected");
    assert.match(String(rejected.reason), /Solicitação não encontrada/);
    assert.equal((await admin.classGroupRequest.findUniqueOrThrow({ where: { id: request.id }, select: { status: true } })).status, "APPROVED");
    assert.equal(await admin.classGroupEnrollment.count({ where: { classGroupId: group.id, studentId: student.id, status: "ACTIVE" } }), 1);
    assert.equal(await admin.studentSubscription.count({ where: { arenaId: arenaA.id, studentId: student.id, planId: plan.id, status: "ACTIVE" } }), 1);
    const recurrence = await admin.financialRecurrence.findFirstOrThrow({ where: { arenaId: arenaA.id, planId: plan.id, playerId: player.id } });
    assert.equal(recurrence.studentId, student.id);
    assert.equal(await admin.financialRecurrence.count({ where: planRecurrenceOwnerWhere({ arenaId: arenaA.id, planId: plan.id, studentId: student.id, studentName: player.name, playerId: player.id }) }), 1);
    const entries = await admin.financialEntry.findMany({ where: { arenaId: arenaA.id, planId: plan.id, playerId: player.id }, orderBy: { dueDate: "asc" }, select: { dueDate: true, recurrenceId: true } });
    assert.equal(entries.length, 12);
    assert.ok(entries.every(({ recurrenceId }) => recurrenceId === recurrence.id));
    assert.equal(entries[0].dueDate?.toISOString().slice(0, 10), "2030-01-10");
    assert.equal(entries[11].dueDate?.toISOString().slice(0, 10), "2030-12-10");
    assert.equal(recurrence.endsAt?.getTime(), entries[11].dueDate?.getTime());
    assert.equal(recurrence.nextDueDate.toISOString().slice(0, 10), "2031-01-10");
    assert.equal(issuedCharges, 1);

    const secondPlayer = await admin.player.create({ data: { arenaId: arenaA.id, name: `Atleta Duas Turmas GOAL ${suffix}` }, select: { id: true, name: true } });
    ids.secondPlayer = secondPlayer.id;
    const secondStudent = await admin.student.create({ data: { arenaId: arenaA.id, playerId: secondPlayer.id, name: secondPlayer.name }, select: { id: true } });
    ids.secondStudent = secondStudent.id;
    const secondGroups = [];
    for (const label of ["Segunda", "Terça"]) {
      const nextGroup = await admin.classGroup.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, name: `Turma ${label} GOAL ${suffix}` }, select: { id: true } });
      secondGroups.push(nextGroup);
      if (label === "Segunda") ids.secondGroup = nextGroup.id;
      else ids.thirdGroup = nextGroup.id;
      await admin.classGroupSchedule.create({ data: { arenaId: arenaA.id, classGroupId: nextGroup.id, weekday: label === "Segunda" ? 1 : 2, startTime: "09:00", capacity: 2 } });
      await admin.classGroupPlan.create({ data: { classGroupId: nextGroup.id, planId: plan.id } });
    }
    const secondRequests = await Promise.all(secondGroups.map((nextGroup) => admin.classGroupRequest.create({ data: { arenaId: arenaA.id, classGroupId: nextGroup.id, studentId: secondStudent.id }, select: { id: true } })));
    const differentGroupApprovals = await Promise.allSettled(secondRequests.map((nextRequest) => approve(nextRequest.id)));
    assert.equal(differentGroupApprovals.filter((result) => result.status === "fulfilled").length, 2);
    assert.equal(await admin.classGroupEnrollment.count({ where: { studentId: secondStudent.id, status: "ACTIVE" } }), 2);
    assert.equal(await admin.studentSubscription.count({ where: { studentId: secondStudent.id, planId: plan.id, status: "ACTIVE" } }), 1);
    assert.equal(await admin.financialRecurrence.count({ where: { planId: plan.id, playerId: secondPlayer.id } }), 1);
    assert.equal(await admin.financialEntry.count({ where: { planId: plan.id, playerId: secondPlayer.id } }), 12);
    assert.equal(issuedCharges, 2);

    await assert.rejects(approve(betaRequest.id), /Solicitação não encontrada/);
    assert.equal((await admin.classGroupRequest.findUniqueOrThrow({ where: { id: betaRequest.id }, select: { status: true } })).status, "PENDING");
  } finally {
    if (ids.plan) {
      await admin.financialEntry.deleteMany({ where: { planId: ids.plan } });
      await admin.financialRecurrence.deleteMany({ where: { planId: ids.plan } });
      await admin.studentSubscription.deleteMany({ where: { planId: ids.plan } });
    }
    if (ids.group) await admin.classGroup.delete({ where: { id: ids.group } });
    if (ids.secondGroup) await admin.classGroup.delete({ where: { id: ids.secondGroup } });
    if (ids.thirdGroup) await admin.classGroup.delete({ where: { id: ids.thirdGroup } });
    if (ids.plan) await admin.plan.delete({ where: { id: ids.plan } });
    if (ids.student) await admin.student.delete({ where: { id: ids.student } });
    if (ids.player) await admin.player.delete({ where: { id: ids.player } });
    if (ids.secondStudent) await admin.student.delete({ where: { id: ids.secondStudent } });
    if (ids.secondPlayer) await admin.player.delete({ where: { id: ids.secondPlayer } });
    if (ids.betaRequest) await admin.classGroupRequest.delete({ where: { id: ids.betaRequest } });
    if (ids.betaStudent) await admin.student.delete({ where: { id: ids.betaStudent } });
    if (ids.betaPlayer) await admin.player.delete({ where: { id: ids.betaPlayer } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
