import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { loadPortalFinancialEntries } from "../src/lib/portal/finance-entries";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("portal keeps all near and overdue debts despite long paid history, with paid history in recent order and tenant isolation", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback das finanças do portal");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const player = await tx.player.create({ data: { arenaId: arenaA.id, name: "Atleta descartável finanças GOAL" }, select: { id: true } });
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const shifted = (days: number) => { const value = new Date(today); value.setDate(value.getDate() + days); return value; };
      await tx.financialEntry.createMany({ data: [
        ...Array.from({ length: 110 }, (_, index) => ({ arenaId: arenaA.id, playerId: player.id, type: "REVENUE", category: "Plano de Aulas", description: `Pago ${index + 1}`, amountCents: 1000, status: "PAID", dueDate: shifted(-index - 1), paidAt: shifted(-index - 1) })),
        { arenaId: arenaA.id, playerId: player.id, type: "REVENUE", category: "Plano de Aulas", description: "Vence em 7 dias", amountCents: 1000, status: "PENDING", dueDate: shifted(7) },
        { arenaId: arenaA.id, playerId: player.id, type: "REVENUE", category: "Plano de Aulas", description: "Vence em 30 dias", amountCents: 1000, status: "PENDING", dueDate: shifted(30) },
        { arenaId: arenaA.id, playerId: player.id, type: "REVENUE", category: "Plano de Aulas", description: "Vencido", amountCents: 1000, status: "OVERDUE", dueDate: shifted(-3) },
      ] });
      const [pending, paid] = await loadPortalFinancialEntries(tx, arenaA.id, player.id, shifted(15));
      assert.deepEqual(pending.map((entry) => entry.description), ["Vencido", "Vence em 7 dias"]);
      assert.equal(paid.length, 12);
      assert.equal(paid[0].description, "Pago 1");
      assert.equal(paid.at(-1)?.description, "Pago 12");

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const [outsidePending, outsidePaid] = await loadPortalFinancialEntries(tx, arenaA.id, player.id, shifted(15));
      assert.equal(outsidePending.length, 0);
      assert.equal(outsidePaid.length, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
