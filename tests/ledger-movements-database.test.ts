import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { ledgerPeriod, loadLedgerMovements } from "../src/lib/reports/ledger-movements";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const u = new URL(url); return u.hostname === "127.0.0.1" && u.port === "55433" && u.pathname === "/arena_goal" && u.username === "postgres"; } catch { return false; } })();
test("ledger dates use the full Brasília calendar day, including reversed date inputs", () => {
  const range = ledgerPeriod("2026-10-27", "2026-10-26");
  assert.equal(range.gte.toISOString(), "2026-10-26T03:00:00.000Z");
  assert.equal(range.lte.toISOString(), "2026-10-28T02:59:59.999Z");
  const fallback = ledgerPeriod("2026-02-31", undefined, new Date("2026-11-01T01:00:00Z"));
  assert.equal(fallback.gte.toISOString(), "2026-10-01T03:00:00.000Z");
  assert.equal(fallback.lte.toISOString(), "2026-11-01T02:59:59.999Z");
});
test("ledger counts actual settlement methods and days, partial balances, categories and all rows under restricted RLS", { skip: !enabled }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } }); const rollback = new Error("rollback ledger fixture");
  try {
    const a = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const b = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const day1 = new Date("2045-10-26T12:00:00Z"), day2 = new Date("2045-10-27T12:00:00Z"), old = new Date("2045-09-01T12:00:00Z");
    const period = ledgerPeriod("2045-10-26", "2045-10-27");
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${a.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const create = (data: Record<string, unknown>) => tx.financialEntry.create({ data: { arenaId: a.id, description: "QA movimento", type: "REVENUE", category: "QA", amountCents: 10000, status: "PENDING", dueDate: day1, createdAt: old, ...data } as Parameters<typeof tx.financialEntry.create>[0]["data"] });
      const partial = await create({});
      await tx.financialSettlement.createMany({ data: [
        { arenaId: a.id, financialEntryId: partial.id, amountCents: 3000, interestCents: 500, paymentMethod: "PIX", paidAt: day1 },
        { arenaId: a.id, financialEntryId: partial.id, amountCents: 1000, paymentMethod: "Dinheiro", paidAt: day2 },
        { arenaId: a.id, financialEntryId: partial.id, amountCents: 2000, paymentMethod: "Saldo do cliente", paidAt: day1 },
      ] });
      await create({ type: "EXPENSE", status: "PAID", amountCents: 500, paymentMethod: "PIX", paidAt: day1 });
      await create({ source: "SCHEDULE_BOOKING", status: "PAID", amountCents: 2000, paymentMethod: "PIX", paidAt: day1 });
      await create({ category: "COMANDAS", status: "PAID", amountCents: 1200, paymentMethod: "Cartão", paidAt: day2 });
      const plan = await tx.plan.create({ data: { arenaId: a.id, name: `QA ledger ${partial.id}` } });
      const planInvoice = await create({ planId: plan.id, status: "PAID", amountCents: 700, paymentMethod: "PIX", paidAt: day1 });
      await tx.financialSettlement.create({ data: { arenaId: a.id, financialEntryId: planInvoice.id, amountCents: 700, paymentMethod: "PIX", paidAt: day1 } });
      await create({ status: "OVERDUE", amountCents: 800 });
      await create({ type: "EXPENSE", status: "PENDING", amountCents: 600 });
      await create({ status: "VOIDED", amountCents: 999999, paidAt: day1 });
      await create({ status: "PAID", amountCents: 999999, paidAt: new Date("2045-10-26T02:59:59Z") });
      await tx.financialEntry.createMany({ data: Array.from({ length: 300 }, () => ({ arenaId: a.id, type: "INCOME", category: "QA", description: "QA além do limite", amountCents: 100, status: "PAID", paymentMethod: "PIX", paidAt: day1, createdAt: old })) });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${b.id}, true)`;
      await tx.financialEntry.create({ data: { arenaId: b.id, type: "INCOME", category: "QA", description: "Outra arena", amountCents: 999999, status: "PAID", paymentMethod: "PIX", paidAt: day1 } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${a.id}, true)`;
      const report = await loadLedgerMovements(tx, a.id, period);
      assert.equal(report.income, 37900); assert.equal(report.expense, 500);
      assert.equal(report.receivable, 5300); assert.equal(report.payable, 600);
      assert.equal(report.records.length, 250);
      assert.equal(report.methods.find(method => method.label === "PIX")?.income, 35700);
      assert.equal(report.days.find(day => day.label === "2045-10-26")?.income, 35700);
      assert.equal(report.days.find(day => day.label === "2045-10-27")?.income, 2200);
      assert.equal(report.methods.some(method => method.label === "Saldo do cliente"), false);
      assert.equal((await loadLedgerMovements(tx, a.id, period, { category: "@planos" })).income, 700);
      assert.equal((await loadLedgerMovements(tx, a.id, period, { category: "@reservas" })).income, 2000);
      assert.equal((await loadLedgerMovements(tx, a.id, period, { category: "@comandas" })).income, 1200);
      assert.equal((await loadLedgerMovements(tx, a.id, period, { paymentMethod: "Dinheiro" })).income, 1000);
      assert.equal((await loadLedgerMovements(tx, b.id, period)).income, 0);
      throw rollback;
    }, { timeout: 30000 }), error => error === rollback);
  } finally { await db.$disconnect(); }
});
