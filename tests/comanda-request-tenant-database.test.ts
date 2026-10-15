import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch {
    return false;
  }
})();

test("comanda requests remain scoped to the arena and its products", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback comanda request fixture");
  try {
    const ownArena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const otherArena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      const key = randomUUID();
      const ownProduct = await tx.product.create({ data: { arenaId: ownArena.id, name: `${key}-own` } });
      const otherProduct = await tx.product.create({ data: { arenaId: otherArena.id, name: `${key}-other` } });
      const ownComanda = await tx.comanda.create({ data: { arenaId: ownArena.id, code: `${key}-own`, label: "Comanda fictícia A" } });
      const otherComanda = await tx.comanda.create({ data: { arenaId: otherArena.id, code: `${key}-other`, label: "Comanda fictícia B" } });
      const ownRequest = await tx.comandaRequest.create({ data: { comandaId: ownComanda.id, productId: ownProduct.id } });
      const otherRequest = await tx.comandaRequest.create({ data: { comandaId: otherComanda.id, productId: otherProduct.id } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${ownArena.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      assert.deepEqual((await tx.comandaRequest.findMany({ where: { id: { in: [ownRequest.id, otherRequest.id] } }, select: { id: true } })).map((item) => item.id), [ownRequest.id]);
      const created = await tx.comandaRequest.create({ data: { comandaId: ownComanda.id, productId: ownProduct.id, quantity: 2 } });
      assert.equal(created.quantity, 2);
      assert.equal((await tx.comandaRequest.updateMany({ where: { id: otherRequest.id }, data: { status: "CONFIRMED" } })).count, 0);
      assert.equal((await tx.comandaRequest.deleteMany({ where: { id: otherRequest.id } })).count, 0);

      await tx.$executeRawUnsafe("SAVEPOINT foreign_parent");
      await assert.rejects(tx.comandaRequest.create({ data: { comandaId: otherComanda.id, productId: otherProduct.id } }), /42501|row-level security|segurança no nível de linha/);
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT foreign_parent");
      await tx.$executeRawUnsafe("SAVEPOINT foreign_product");
      await assert.rejects(tx.comandaRequest.create({ data: { comandaId: ownComanda.id, productId: otherProduct.id } }), /42501|row-level security|segurança no nível de linha/);
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT foreign_product");
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
