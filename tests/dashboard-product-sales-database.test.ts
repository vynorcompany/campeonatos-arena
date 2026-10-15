import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadDashboardProductSales } from "../src/lib/reports/dashboard-product-sales";
import { loadProductReportData, loadStockReportData } from "../src/lib/reports/operational-report-data";
import { loadVisibleProductNames, visibleProductName } from "../src/lib/products/visible-product-names";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch {
    return false;
  }
})();

test("dashboard product ranking survives a legacy sale linked to another arena's product", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback dashboard product fixture");
  const period = { gte: new Date("2046-01-01T00:00:00Z"), lte: new Date("2046-01-31T23:59:59Z") };
  try {
    const ownArena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const otherArena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      const prefix = randomUUID();
      const ownProduct = await tx.product.create({ data: { arenaId: ownArena.id, name: `${prefix}-own` } });
      const otherProduct = await tx.product.create({ data: { arenaId: otherArena.id, name: `${prefix}-other` } });
      const sale = await tx.sale.create({ data: { arenaId: ownArena.id, code: prefix, paymentMethod: "PIX", totalCents: 3_000, createdAt: period.gte } });
      await tx.saleItem.createMany({ data: [
        { saleId: sale.id, productId: ownProduct.id, quantity: 2, unitPriceCents: 1_000, totalCents: 2_000 },
        { saleId: sale.id, productId: otherProduct.id, quantity: 1, unitPriceCents: 1_000, totalCents: 1_000 }
      ] });
      await tx.stockMovement.create({ data: { arenaId: ownArena.id, productId: otherProduct.id, type: "OUT", quantity: 1, createdAt: period.gte } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${ownArena.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const ranking = await loadDashboardProductSales(tx, ownArena.id, period);
      assert.deepEqual(ranking, [{ name: ownProduct.name, value: 2 }]);
      assert.ok(!JSON.stringify(ranking).includes(otherProduct.name));
      const productReport = await loadProductReportData(tx, ownArena.id, period);
      assert.equal(productReport.items.length, 2);
      assert.equal(visibleProductName(productReport.productNames, otherProduct.id), "Produto indisponível");
      const stockReport = await loadStockReportData(tx, ownArena.id, period);
      assert.equal(stockReport.movements.length, 1);
      assert.equal(visibleProductName(stockReport.productNames, otherProduct.id), "Produto indisponível");
      const names = await loadVisibleProductNames(tx, ownArena.id, [ownProduct.id, otherProduct.id]);
      assert.equal(names.get(ownProduct.id), ownProduct.name);
      assert.equal(names.has(otherProduct.id), false);
      await tx.$executeRawUnsafe("SAVEPOINT cross_tenant_product");
      await assert.rejects(tx.saleItem.create({ data: { saleId: sale.id, productId: otherProduct.id, quantity: 1, unitPriceCents: 100, totalCents: 100 } }), /42501|row-level security|segurança no nível de linha/);
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT cross_tenant_product");
      const ownItem = await tx.saleItem.create({ data: { saleId: sale.id, productId: ownProduct.id, quantity: 3, unitPriceCents: 100, totalCents: 300 } });
      assert.equal(ownItem.productId, ownProduct.id);
      assert.deepEqual(await loadDashboardProductSales(tx, ownArena.id, period), [{ name: ownProduct.name, value: 5 }]);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
