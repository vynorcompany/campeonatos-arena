import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { financialReportWhere, financialTypeTotals, loadDreReportData, loadLedgerReportData } from "../src/lib/reports/financial-report-data";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres"; }
  catch { return false; }
})();

test("financial report filters stay scoped to the arena before limiting displayed entries", () => {
  const period = { gte: new Date("2026-10-01"), lte: new Date("2026-10-31") };
  assert.deepEqual(financialReportWhere({ arenaId: "arena-a", period, type: "REVENUE", status: "PAID", category: "Aulas", paymentMethod: "PIX", bankAccountId: "bank-a" }), {
    arenaId: "arena-a", createdAt: period, status: "PAID", type: { in: ["REVENUE", "INCOME"] }, category: "Aulas", paymentMethod: "PIX", bankAccountId: "bank-a"
  });
  assert.deepEqual(financialReportWhere({ arenaId: "arena-b", period }).status, { not: "VOIDED" });
});

test("ledger and DRE totals include entries beyond the visible row limits", async () => {
  const calls: Array<{ method: string; query: Record<string, unknown> }> = [];
  const records = Array.from({ length: 301 }, (_, index) => ({ id: `entry-${index}` }));
  const groups = [{ type: "REVENUE", _sum: { amountCents: 30_100 } }, { type: "EXPENSE", _sum: { amountCents: 5_000 } }];
  const delegate = {
    findMany: async (query: Record<string, unknown>) => { calls.push({ method: "findMany", query }); return records.slice(0, Number(query.take)); },
    groupBy: async (query: Record<string, unknown>) => {
      calls.push({ method: "groupBy", query });
      return (query.by as string[]).includes("status")
        ? [{ status: "PAID", paymentMethod: "PIX", _sum: { amountCents: 30_100 }, _count: { _all: 301 } }]
        : groups;
    }
  };
  const db = { financialEntry: delegate } as unknown as Parameters<typeof loadLedgerReportData>[0];
  const where = { arenaId: "arena-a", status: { not: "VOIDED" } };

  const ledger = await loadLedgerReportData(db, where);
  assert.equal(ledger.entries.length, 250);
  assert.deepEqual(financialTypeTotals(ledger.byType), { revenue: 30_100, expense: 5_000 });
  assert.equal(ledger.byPaymentStatus[0]?._count._all, 301);
  assert.ok(calls.every(({ query }) => query.where === where));
  assert.ok(calls.filter(({ method }) => method === "groupBy").every(({ query }) => query.take === undefined));

  calls.length = 0;
  const dre = await loadDreReportData(db, where);
  assert.equal("entries" in dre, false);
  assert.deepEqual(financialTypeTotals(dre.byType), { revenue: 30_100, expense: 5_000 });
  assert.ok(calls.every(({ method }) => method === "groupBy"));
  assert.ok(calls.every(({ query }) => query.where === where));
});

test("financial totals use every scoped record under the runtime tenant role", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback financial report fixture");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const createdAt = new Date("2044-10-15T12:00:00.000Z");
    const period = { gte: new Date("2044-10-15T00:00:00.000Z"), lte: new Date("2044-10-15T23:59:59.999Z") };
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      await tx.financialEntry.createMany({ data: Array.from({ length: 251 }, () => ({ arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Teste descartável", amountCents: 100, status: "PAID", paymentMethod: "PIX", createdAt })) });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      await tx.financialEntry.create({ data: { arenaId: arenaB.id, type: "REVENUE", category: "GOAL", description: "Outra arena", amountCents: 999, status: "PAID", paymentMethod: "PIX", createdAt } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const where = financialReportWhere({ arenaId: arenaA.id, period });
      const scopedDb = tx as unknown as Parameters<typeof loadLedgerReportData>[0];
      const ledger = await loadLedgerReportData(scopedDb, where);
      const dre = await loadDreReportData(scopedDb, where);
      assert.equal(ledger.entries.length, 250);
      assert.equal("entries" in dre, false);
      assert.deepEqual(financialTypeTotals(ledger.byType), { revenue: 25_100, expense: 0 });
      assert.deepEqual(financialTypeTotals(dre.byType), { revenue: 25_100, expense: 0 });
      assert.equal(ledger.byPaymentStatus[0]?._count._all, 251);
      const foreign = await loadLedgerReportData(scopedDb, financialReportWhere({ arenaId: arenaB.id, period }));
      assert.equal(foreign.entries.length, 0);
      assert.equal(foreign.byType.length, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
