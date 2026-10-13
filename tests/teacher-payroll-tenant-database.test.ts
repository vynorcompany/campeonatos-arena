import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("folha do professor só aparece para a arena ativa e continua contando no bloqueio de exclusão", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da folha de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const teacherA = await tx.teacher.create({ data: { arenaId: arenaA.id, name: `Professor próprio ${Date.now()}` } });
      const ownPayroll = await tx.teacherPayrollEntry.create({ data: { arenaId: arenaA.id, teacherId: teacherA.id, referenceMonth: "2035-01" } });
      const count = await tx.teacher.findFirst({ where: { id: teacherA.id }, select: { _count: { select: { payrollEntries: true } } } });
      assert.equal(count?._count.payrollEntries, 1);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.teacherPayrollEntry.findFirst({ where: { id: ownPayroll.id } }), null);
      await tx.$executeRaw`SELECT set_config('app.arena_id', '', true)`;
      assert.equal(await tx.teacherPayrollEntry.findFirst({ where: { id: ownPayroll.id } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("folha não pode vincular professor de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da folha cruzada de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const teacher = await tx.teacher.create({ data: { arenaId: arenaB.id, name: `Professor externo ${Date.now()}` } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.teacherPayrollEntry.create({ data: { arenaId: arenaA.id, teacherId: teacher.id, referenceMonth: "2035-01" } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
