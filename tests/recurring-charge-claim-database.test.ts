import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { claimFinancialOnlineCharge } from "../src/lib/payments/financial-online-charge-claim";
import { recurringBoletoEntryWhere } from "../src/lib/payments/recurring-charge-eligibility";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("emissão automática de boleto não disputa lançamento já reivindicado para Pix", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const suffix = randomUUID();
  const recurrenceId = `goal-recurrence-${suffix}`;
  const entryId = `goal-entry-${suffix}`;
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const dueDate = new Date("2035-01-05T12:00:00.000Z");
    await admin.financialRecurrence.create({ data: {
      id: recurrenceId, arenaId: arena.id, type: "REVENUE", counterpartyName: "Teste descartável", category: "Teste",
      description: "Recorrência descartável", amountCents: 5000, frequency: "MONTHLY", startsAt: dueDate,
      nextDueDate: dueDate, onlinePaymentMethod: "BOLETO", playerId: "goal-athlete-a",
    } });
    await admin.financialEntry.create({ data: {
      id: entryId, arenaId: arena.id, type: "REVENUE", category: "Teste", description: "Lançamento descartável",
      amountCents: 5000, status: "PENDING", dueDate, recurrenceId, playerId: "goal-athlete-a",
    } });
    const scanAt = new Date("2035-01-01T12:00:00.000Z");
    const dueBefore = new Date(scanAt.getTime() + 15 * 24 * 60 * 60_000);
    const eligible = () => runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      return tx.financialEntry.findMany({ where: recurringBoletoEntryWhere(arena.id, dueBefore), select: { id: true } });
    });
    assert.ok((await eligible()).some((entry) => entry.id === entryId));
    const claim = await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      return claimFinancialOnlineCharge(tx, { arenaId: arena.id, entryId, method: "PIX", expectedAmountCents: 5000 });
    });
    assert.equal(claim.ok, true);
    assert.ok(!(await eligible()).some((entry) => entry.id === entryId));
  } finally {
    await admin.financialEntry.deleteMany({ where: { id: entryId } });
    await admin.financialRecurrence.deleteMany({ where: { id: recurrenceId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
