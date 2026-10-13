import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("movimentação de estoque não pode apontar para produto de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do estoque de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const ownProduct = await tx.product.create({ data: { arenaId: arenaA.id, name: `GOAL próprio ${Date.now()}` } });
      const ownMovement = await tx.stockMovement.create({ data: { arenaId: arenaA.id, productId: ownProduct.id, type: "IN", quantity: 1 } });
      assert.equal((await tx.stockMovement.findFirst({ where: { id: ownMovement.id }, include: { product: { select: { arenaId: true } } } }))?.product.arenaId, arenaA.id);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignProduct = await tx.product.create({ data: { arenaId: arenaB.id, name: `GOAL externo ${Date.now()}` } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.stockMovement.create({ data: { arenaId: arenaA.id, productId: foreignProduct.id, type: "OUT", quantity: 1 } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
