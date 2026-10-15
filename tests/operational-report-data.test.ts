import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadCashReportData, loadComandaReportData, loadOnlinePaymentReportData, loadProductReportData, loadStockReportData } from "../src/lib/reports/operational-report-data";

const period = { gte: new Date("2045-01-01T00:00:00.000Z"), lte: new Date("2045-01-31T23:59:59.999Z") };
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres"; }
  catch { return false; }
})();

test("operational summaries are not limited by the displayed rows", async () => {
  const calls: Array<{ operation: string; query: Record<string, unknown> }> = [];
  const capture = (operation: string, result: unknown) => async (query: Record<string, unknown>) => { calls.push({ operation, query }); return result; };
  const db = {
    cashRegister: { findMany: capture("cashRows", Array(250).fill({})), count: capture("cashCount", 251), aggregate: capture("cashSum", { _sum: { differenceCents: 75 } }) },
    cashMovement: { count: capture("cashMovementCount", 502) },
    saleItem: { findMany: capture("productRows", Array(100).fill({})), aggregate: capture("productSum", { _sum: { quantity: 202, totalCents: 10_100 } }), groupBy: capture("productGroups", [{ productId: "a" }, { productId: "b" }]) },
    stockMovement: { findMany: capture("stockRows", Array(100).fill({})), count: capture("stockCount", 101), groupBy: capture("stockGroups", [{ type: "IN", _sum: { quantity: 50 } }, { type: "OUT", _sum: { quantity: 3 } }]) },
    comanda: { findMany: capture("commandRows", Array(100).fill({})), count: capture("commandCount", 101) },
    sale: { aggregate: capture("commandSum", { _sum: { totalCents: 9_900 } }) },
    onlinePaymentCheckout: { findMany: capture("paymentRows", Array(250).fill({})), groupBy: capture("paymentGroups", [{ status: "PAID", _sum: { amountCents: 1_000 } }, { status: "PENDING", _sum: { amountCents: 200 } }, { status: "IN_PROCESS", _sum: { amountCents: 300 } }, { status: "AUTHORIZED", _sum: { amountCents: 400 } }, { status: "FAILED", _sum: { amountCents: 500 } }]) },
  };
  const cash = await loadCashReportData(db as unknown as Parameters<typeof loadCashReportData>[0], "arena-a", period);
  const products = await loadProductReportData(db as unknown as Parameters<typeof loadProductReportData>[0], "arena-a", period);
  const stock = await loadStockReportData(db as unknown as Parameters<typeof loadStockReportData>[0], "arena-a", period);
  const commands = await loadComandaReportData(db as unknown as Parameters<typeof loadComandaReportData>[0], "arena-a", period);
  const online = await loadOnlinePaymentReportData(db as unknown as Parameters<typeof loadOnlinePaymentReportData>[0], "arena-a", period);

  assert.deepEqual([cash.registers.length, cash.registerCount, cash.movementCount, cash.differenceCents], [250, 251, 502, 75]);
  assert.deepEqual([products.items.length, products.quantity, products.totalCents, products.productCount], [100, 202, 10_100, 2]);
  assert.deepEqual([stock.movements.length, stock.movementCount, stock.entries, stock.exits], [100, 101, 50, 3]);
  assert.deepEqual([commands.comandas.length, commands.count, commands.openCount, commands.totalCents], [100, 101, 101, 9_900]);
  assert.deepEqual([online.payments.length, online.confirmedCents, online.pendingCents], [250, 1_000, 900]);
  assert.ok(calls.every(({ query }) => JSON.stringify(query).includes("arena-a")));
  assert.ok(calls.filter(({ operation }) => operation.endsWith("Rows")).every(({ query }) => typeof query.take === "number"));
  assert.ok(calls.filter(({ operation }) => !operation.endsWith("Rows")).every(({ query }) => query.take === undefined));
});

test("stock aggregation includes movement 101 and excludes another arena under runtime RLS", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback operational report fixture");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const ownProduct = await tx.product.create({ data: { arenaId: arenaA.id, name: "GOAL report stock A" } });
      await tx.stockMovement.createMany({ data: Array.from({ length: 101 }, () => ({ arenaId: arenaA.id, productId: ownProduct.id, type: "IN", quantity: 2, createdAt: period.gte })) });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignProduct = await tx.product.create({ data: { arenaId: arenaB.id, name: "GOAL report stock B" } });
      await tx.stockMovement.create({ data: { arenaId: arenaB.id, productId: foreignProduct.id, type: "IN", quantity: 999, createdAt: period.gte } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const scoped = tx as unknown as Parameters<typeof loadStockReportData>[0];
      const report = await loadStockReportData(scoped, arenaA.id, period);
      assert.equal(report.movements.length, 100);
      assert.equal(report.movementCount, 101);
      assert.equal(report.entries, 202);
      const foreign = await loadStockReportData(scoped, arenaB.id, period);
      assert.equal(foreign.movementCount, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("cash and comanda totals include records beyond their displayed limits", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback cash and command report fixture");
  try {
    const arena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const register = await tx.cashRegister.create({ data: { arenaId: arena.id, referenceDate: period.gte, status: "CLOSED", differenceCents: 40 } });
      await tx.cashRegister.createMany({ data: Array.from({ length: 250 }, () => ({ arenaId: arena.id, referenceDate: period.gte, status: "CLOSED" })) });
      await tx.cashMovement.create({ data: { arenaId: arena.id, registerId: register.id, type: "SALE", amountCents: 100 } });
      const cash = await loadCashReportData(tx, arena.id, period);
      assert.deepEqual([cash.registers.length, cash.registerCount, cash.movementCount, cash.differenceCents], [250, 251, 1, 40]);

      const codePrefix = randomUUID();
      const command = await tx.comanda.create({ data: { arenaId: arena.id, code: `${codePrefix}-0`, label: "GOAL descartável", openedAt: period.gte, status: "CLOSED" } });
      await tx.comanda.createMany({ data: Array.from({ length: 100 }, (_, index) => ({ arenaId: arena.id, code: `${codePrefix}-${index + 1}`, label: "GOAL descartável", openedAt: period.gte })) });
      await tx.sale.create({ data: { arenaId: arena.id, code: `sale-${codePrefix}`, comandaId: command.id, paymentMethod: "PIX", totalCents: 120 } });
      const commands = await loadComandaReportData(tx, arena.id, period);
      assert.deepEqual([commands.comandas.length, commands.count, commands.openCount, commands.totalCents], [100, 101, 100, 120]);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
