import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { comandaDebtOwnerId, selectedComandaDebtWhere } from "../src/lib/finance/comanda-debts";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("comanda não oferece débito de homônimo, despesa ou outra arena e aceita vencido do cliente", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback dos débitos descartáveis");
  const suffix = randomBytes(6).toString("hex");
  try {
    const [arenaA, arenaB] = await Promise.all([
      db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    await assert.rejects(db.$transaction(async (tx) => {
      const name = `Cliente homônimo ${suffix}`;
      const [owner, homonym, foreign] = await Promise.all([
        tx.player.create({ data: { arenaId: arenaA.id, name } }),
        tx.player.create({ data: { arenaId: arenaA.id, name } }),
        tx.player.create({ data: { arenaId: arenaB.id, name } }),
      ]);
      const createEntry = (arenaId: string, playerId: string, status: string, type = "REVENUE") => tx.financialEntry.create({ data: {
        arenaId, playerId, counterpartyName: name, description: `Débito descartável ${suffix}`, amountCents: 1000, status, type, category: "Teste",
      } });
      const [overdue, sameName, expense, otherArena] = await Promise.all([
        createEntry(arenaA.id, owner.id, "OVERDUE"),
        createEntry(arenaA.id, homonym.id, "PENDING"),
        createEntry(arenaA.id, owner.id, "PENDING", "EXPENSE"),
        createEntry(arenaB.id, foreign.id, "PENDING"),
      ]);
      const entries = await tx.financialEntry.findMany({
        where: selectedComandaDebtWhere(arenaA.id, [overdue.id, sameName.id, expense.id, otherArena.id]),
        select: { id: true, playerId: true, scheduleParticipant: { select: { playerId: true } }, sale: { select: { comanda: { select: { playerId: true } } } } },
      });
      assert.deepEqual(entries.filter((entry) => comandaDebtOwnerId(entry) === owner.id).map((entry) => entry.id), [overdue.id]);
      assert.deepEqual(new Set(entries.map((entry) => entry.id)), new Set([overdue.id, sameName.id]));
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
