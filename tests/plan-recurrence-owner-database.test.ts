import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { planRecurrenceOwnerWhere } from "../src/lib/academy/plan-recurrence-owner";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("encerrar um plano seleciona só recorrências do aluno, inclusive legado identificável", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback das recorrências descartáveis");
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const suffix = randomUUID();
      const plan = await tx.plan.create({ data: { arenaId: arena.id, name: `Plano recorrência GOAL ${suffix}` } });
      const player = await tx.player.create({ data: { arenaId: arena.id, name: `Aluno recorrência GOAL ${suffix}` } });
      const otherPlayer = await tx.player.create({ data: { arenaId: arena.id, name: `Outro aluno GOAL ${suffix}` } });
      const student = await tx.student.create({ data: { arenaId: arena.id, playerId: player.id, name: player.name } });
      const startedAt = new Date("2030-01-02T12:00:00.000Z");
      const makeRecurrence = (overrides: Record<string, unknown> = {}) => tx.financialRecurrence.create({ data: {
        arenaId: arena.id, planId: plan.id, playerId: player.id, counterpartyName: player.name,
        type: "REVENUE", category: "Planos de aulas", description: "Recorrência GOAL",
        amountCents: 10000, frequency: "MONTHLY", startsAt: startedAt,
        nextDueDate: new Date("2030-02-02T12:00:00.000Z"), active: true,
        notes: "Ativação do plano de aulas.", ...overrides,
      } });
      const owned = await makeRecurrence({ studentId: student.id });
      const legacy = await makeRecurrence();
      const other = await makeRecurrence({ playerId: otherPlayer.id, counterpartyName: player.name });
      const manual = await makeRecurrence({ notes: "Recorrência financeira manual" });
      const otherCycle = await makeRecurrence({ startsAt: new Date("2031-01-02T12:00:00.000Z") });
      const where = planRecurrenceOwnerWhere({ arenaId: arena.id, planId: plan.id, studentId: student.id, studentName: student.name, playerId: player.id, startedAt });
      const matches = await tx.financialRecurrence.findMany({ where, select: { id: true } });
      assert.deepEqual(new Set(matches.map(({ id }) => id)), new Set([owned.id, legacy.id]));
      assert.equal((await tx.financialRecurrence.updateMany({ where, data: { active: false } })).count, 2);
      const untouched = await tx.financialRecurrence.findMany({ where: { id: { in: [other.id, manual.id, otherCycle.id] } }, select: { active: true } });
      assert.equal(untouched.length, 3);
      assert.ok(untouched.every(({ active }) => active));
      const unlinked = await tx.student.create({ data: { arenaId: arena.id, name: `Aluno sem cadastro GOAL ${suffix}` } });
      const unlinkedLegacy = await makeRecurrence({ playerId: null, counterpartyName: unlinked.name });
      const unlinkedManual = await makeRecurrence({ playerId: null, counterpartyName: unlinked.name, notes: "Recorrência financeira manual" });
      const unlinkedWhere = planRecurrenceOwnerWhere({ arenaId: arena.id, planId: plan.id, studentId: unlinked.id, studentName: unlinked.name, playerId: null, startedAt });
      const unlinkedMatches = await tx.financialRecurrence.findMany({ where: unlinkedWhere, select: { id: true } });
      assert.deepEqual(unlinkedMatches.map(({ id }) => id), [unlinkedLegacy.id]);
      assert.equal((await tx.financialRecurrence.findUniqueOrThrow({ where: { id: unlinkedManual.id } })).active, true);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
    await admin.$disconnect();
  }
});
