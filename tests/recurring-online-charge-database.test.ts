import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { recurringBoletoEntryWhere } from "../src/lib/payments/recurring-charge-eligibility";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(databaseUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("paginação de boletos recorrentes respeita o contexto da arena no PostgreSQL", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback dos boletos de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const incomplete = await tx.player.create({ data: { arenaId: arenaA.id, name: "Cadastro incompleto descartável" } });
      const complete = await tx.player.create({ data: {
        arenaId: arenaA.id, name: "Cadastro completo descartável", email: "atleta@example.test", cpf: "12345678901",
        addressZipCode: "12345678", addressStreet: "Rua Teste", addressNumber: "1",
        addressNeighborhood: "Centro", addressCity: "Cidade", addressState: "SP",
      } });
      const recurrence = await tx.financialRecurrence.create({ data: {
        arenaId: arenaA.id, type: "REVENUE", counterpartyName: "Teste descartável", category: "GOAL",
        description: "Boleto descartável", amountCents: 5000, frequency: "MONTHLY",
        startsAt: new Date("2026-10-15T12:00:00.000Z"), nextDueDate: new Date("2026-10-15T12:00:00.000Z"),
        onlinePaymentMethod: "BOLETO", playerId: incomplete.id,
      } });
      await tx.financialEntry.createMany({ data: Array.from({ length: 251 }, () => ({
        arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Boleto incompleto descartável",
        amountCents: 5000, dueDate: new Date("2026-10-15T12:00:00.000Z"),
        recurrenceId: recurrence.id, playerId: incomplete.id,
      })) });
      const valid = await tx.financialEntry.create({ data: {
        arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Boleto válido descartável",
        amountCents: 5000, dueDate: new Date("2026-10-16T12:00:00.000Z"),
        recurrenceId: recurrence.id, playerId: complete.id,
      } });
      const query = {
        where: recurringBoletoEntryWhere(arenaA.id, new Date("2026-10-29T12:00:00.000Z")),
        select: { id: true, player: { select: { email: true } } },
        orderBy: [{ dueDate: "asc" }, { id: "asc" }], take: 250,
      } satisfies Prisma.FinancialEntryFindManyArgs;
      const first = await tx.financialEntry.findMany(query);
      assert.equal(first.length, 250);
      assert.equal(first.some((entry) => entry.id === valid.id), false);
      const second = await tx.financialEntry.findMany({ ...query, cursor: { id: first.at(-1)!.id }, skip: 1 });
      assert.equal(second.length, 2);
      assert.equal(second.at(-1)?.id, valid.id);
      assert.equal(second.at(-1)?.player?.email, "atleta@example.test");

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal((await tx.financialEntry.findMany(query)).length, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
