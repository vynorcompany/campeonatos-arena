import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { lockClassGroupCapacity } from "../src/lib/academy/class-group-capacity";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("duas transferências simultâneas respeitam a última vaga e preservam a origem do rejeitado", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: { teacher?: string; teacherPlayer?: string; groups: string[]; students: string[] } = { groups: [], students: [] };
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const suffix = randomUUID();
    const teacherPlayer = await admin.player.create({ data: { arenaId: arenaA.id, name: `Professor Capacidade GOAL ${suffix}` }, select: { id: true } });
    ids.teacherPlayer = teacherPlayer.id;
    const teacher = await admin.teacher.create({ data: { arenaId: arenaA.id, playerId: teacherPlayer.id, name: `Professor Capacidade GOAL ${suffix}` }, select: { id: true } });
    ids.teacher = teacher.id;
    const groups: Array<{ id: string }> = [];
    for (const [index, label] of ["Origem Um", "Origem Dois", "Destino"].entries()) {
      const group = await admin.classGroup.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, name: `Turma ${label} GOAL ${suffix}` }, select: { id: true } });
      ids.groups.push(group.id);
      groups.push(group);
      await admin.classGroupSchedule.create({ data: { arenaId: arenaA.id, classGroupId: group.id, weekday: index + 1, startTime: "09:00", capacity: 1 } });
    }
    for (const [index, source] of groups.slice(0, 2).entries()) {
      const student = await admin.student.create({ data: { arenaId: arenaA.id, name: `Aluno Transferência ${index} GOAL ${suffix}` }, select: { id: true } });
      ids.students.push(student.id);
      await admin.classGroupEnrollment.create({ data: { arenaId: arenaA.id, classGroupId: source.id, studentId: student.id } });
    }

    const source = readFileSync(new URL("../src/lib/actions/class-groups.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: arenaA.id, playerId: teacherPlayer.id }) },
      "@/lib/auth/guards": {},
      "@/lib/finance/recurrences": {},
      "@/lib/calendar/court-slot-availability": {},
      "@/lib/calendar/arena-wall-clock": {},
      "@/lib/payments/recurring-online-charges": {},
      "@/lib/academy/class-group-capacity": { lockClassGroupCapacity },
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
    const move = (studentId: string, destinationClassGroupId: string) => {
      const form = new FormData();
      form.set("arenaSlug", "arena-teste-goal");
      form.set("studentId", studentId);
      form.set("destinationClassGroupId", destinationClassGroupId);
      return exports.moveClassGroupStudentAction(form);
    };

    const results = await Promise.allSettled(ids.students.map((studentId) => move(studentId, groups[2].id)));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejectedIndex = results.findIndex((result) => result.status === "rejected");
    assert.ok(rejectedIndex >= 0);
    assert.match(String((results[rejectedIndex] as PromiseRejectedResult).reason), /não possui vagas/);
    assert.equal(await admin.classGroupEnrollment.count({ where: { classGroupId: groups[2].id, status: "ACTIVE" } }), 1);
    assert.equal(await admin.classGroupEnrollment.count({ where: { classGroupId: groups[rejectedIndex].id, studentId: ids.students[rejectedIndex], status: "ACTIVE" } }), 1);

    const betaGroup = await admin.classGroup.findUniqueOrThrow({ where: { arenaId_name: { arenaId: arenaB.id, name: "Turma Exclusiva Outra Arena GOAL" } }, select: { id: true } });
    await assert.rejects(move(ids.students[rejectedIndex], betaGroup.id), /Selecione uma turma de destino diferente/);
    assert.equal(await admin.classGroupEnrollment.count({ where: { classGroupId: betaGroup.id } }), 0);
  } finally {
    for (const groupId of ids.groups) await admin.classGroup.delete({ where: { id: groupId } });
    for (const studentId of ids.students) await admin.student.delete({ where: { id: studentId } });
    if (ids.teacher) await admin.teacher.delete({ where: { id: ids.teacher } });
    if (ids.teacherPlayer) await admin.player.delete({ where: { id: ids.teacherPlayer } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
