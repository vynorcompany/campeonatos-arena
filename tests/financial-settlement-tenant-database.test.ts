import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("baixa financeira só vincula lançamento e venda da mesma arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da baixa financeira de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });

    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreign = await tx.financialEntry.create({ data: { arenaId: arenaB.id, type: "REVENUE", category: "GOAL", description: "Lançamento externo descartável", amountCents: 100 } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.financialSettlement.create({ data: { arenaId: arenaA.id, financialEntryId: foreign.id, amountCents: 100, paymentMethod: "PIX" } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);

    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const own = await tx.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Lançamento próprio descartável", amountCents: 100 } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignSale = await tx.sale.create({ data: { arenaId: arenaB.id, code: `GOAL-${Date.now()}`, customerName: "Teste", paymentMethod: "PIX", totalCents: 100 } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.financialSettlement.create({ data: { arenaId: arenaA.id, financialEntryId: own.id, saleId: foreignSale.id, amountCents: 100, paymentMethod: "PIX" } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
