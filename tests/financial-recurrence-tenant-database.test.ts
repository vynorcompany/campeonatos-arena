import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

const start = new Date("2035-01-02T12:00:00Z");
const recurrenceData = (arenaId: string) => ({
  arenaId, type: "REVENUE", counterpartyName: "Teste descartável", category: "GOAL",
  description: "Recorrência descartável", amountCents: 1000, frequency: "MONTHLY",
  startsAt: start, nextDueDate: start,
});

test("recorrência financeira exige contexto da arena e oculta dados de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da recorrência de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreign = await tx.financialRecurrence.create({ data: recurrenceData(arenaB.id) });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const own = await tx.financialRecurrence.create({ data: recurrenceData(arenaA.id) });
      assert.equal((await tx.financialRecurrence.findFirst({ where: { id: own.id } }))?.id, own.id);
      assert.equal(await tx.financialRecurrence.findFirst({ where: { id: foreign.id } }), null);
      await tx.$executeRaw`SELECT set_config('app.arena_id', '', true)`;
      assert.equal(await tx.financialRecurrence.findFirst({ where: { id: own.id } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("recorrência financeira rejeita plano de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do plano de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignPlan = await tx.plan.create({ data: { arenaId: arenaB.id, name: `Plano externo ${Date.now()}` } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.financialRecurrence.create({ data: { ...recurrenceData(arenaA.id), planId: foreignPlan.id } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
