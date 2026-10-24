import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { syncStandardServiceCatalog } from "../src/lib/products/standard-service-catalog";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const u = new URL(url); return u.hostname === "127.0.0.1" && u.port === "55433" && u.pathname === "/arena_goal"; } catch { return false; } })();
test("serviço padrão entra no catálogo sem substituir produto físico, sem duplicar e preservando as chaves", { skip: !enabled }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    await assert.rejects(db.$transaction(async tx => {
      const arena = await tx.arena.create({ data: { name: "Catálogo descartável", slug: `catalog-${randomUUID()}`, createdById: "goal-test" } });
      const physical = await tx.product.create({ data: { arenaId: arena.id, name: "Liga", stockQuantity: 10, priceCents: 888 } });
      const service = await syncStandardServiceCatalog(tx, arena.id, "LEAGUE", 3900, "goal-test");
      assert.equal(service.isService, true); assert.equal(service.showOnComandas, true); assert.equal(service.showOnAgenda, true);
      assert.notEqual(service.id, physical.id); assert.notEqual(service.name, physical.name);
      assert.equal(service.priceCents, 3900); assert.equal(service.stockQuantity, 0);
      await tx.product.update({ where: { id: service.id }, data: { showOnAgenda: false, showOnComandas: false } });
      const updated = await syncStandardServiceCatalog(tx, arena.id, "LEAGUE", 4500, "goal-test");
      assert.equal(updated.id, service.id); assert.equal(updated.priceCents, 4500);
      assert.equal(updated.showOnAgenda, false); assert.equal(updated.showOnComandas, false);
      assert.equal(await tx.product.count({ where: { arenaId: arena.id } }), 2);
      const unchanged = await tx.product.findUniqueOrThrow({ where: { id: physical.id } });
      assert.equal(unchanged.stockQuantity, 10); assert.equal(unchanged.priceCents, 888);
      throw new Error("rollback-catalog-fixture");
    }), /rollback-catalog-fixture/);
  } finally { await db.$disconnect(); }
});
