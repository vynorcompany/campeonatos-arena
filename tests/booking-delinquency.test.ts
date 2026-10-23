import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { bookingDelinquencyCutoff, getBookingDelinquency } from "../src/lib/calendar/booking-delinquency";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("inadimplência conta dias inteiros depois do vencimento", () => {
  const today = new Date(2030, 0, 10);
  assert.equal(bookingDelinquencyCutoff(1, today).getTime(), today.getTime());
  assert.equal(bookingDelinquencyCutoff(3, today).getTime(), new Date(2030, 0, 8).getTime());
});

test("bloqueio considera saldo em aberto e permanece isolado por arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = testUrl.replace("postgres@", "arena_runtime@");
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback do bloqueio de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const playerA = await tx.player.create({ data: { arenaId: arenaA.id, name: "Cliente descartável do bloqueio" }, select: { id: true } });
      const today = new Date(2030, 0, 10);
      await tx.financialEntry.create({ data: {
        arenaId: arenaA.id, playerId: playerA.id, type: "REVENUE", category: "Teste", description: "Cobrança descartável atrasada",
        amountCents: 10000, status: "PENDING", dueDate: new Date(2030, 0, 7),
        settlements: { create: { arenaId: arenaA.id, amountCents: 4000, paymentMethod: "PIX" } },
      } });
      await tx.financialEntry.create({ data: {
        arenaId: arenaA.id, playerId: playerA.id, type: "INCOME", category: "Teste", description: "Cobrança descartável recente",
        amountCents: 5000, status: "PENDING", dueDate: new Date(2030, 0, 9),
      } });
      assert.deepEqual(await getBookingDelinquency(tx, arenaA.id, playerA.id, null, today), { blocked: false, count: 0, outstandingCents: 0 });
      assert.deepEqual(await getBookingDelinquency(tx, arenaA.id, playerA.id, 3, today), { blocked: true, count: 1, outstandingCents: 6000 });
      assert.deepEqual(await getBookingDelinquency(tx, arenaA.id, playerA.id, 4, today), { blocked: false, count: 0, outstandingCents: 0 });
      const linkedEntry = async (amountCents: number) => tx.financialEntry.create({ data: {
        arenaId: arenaA.id, type: "REVENUE", category: "Teste", description: "Cobrança vinculada sem playerId",
        amountCents, status: "PENDING", dueDate: new Date(2030, 0, 7),
      } });
      const bookingCharge = await linkedEntry(2000);
      const occurrence = await tx.scheduleOccurrence.create({ data: {
        arenaId: arenaA.id, sourceType: "BOOKING", title: "Reserva de teste", status: "SCHEDULED",
        startsAt: new Date(2030, 0, 7, 10), endsAt: new Date(2030, 0, 7, 11),
      } });
      await tx.scheduleParticipant.create({ data: { occurrenceId: occurrence.id, playerId: playerA.id, financialEntryId: bookingCharge.id } });
      const recurrence = await tx.financialRecurrence.create({ data: {
        arenaId: arenaA.id, playerId: playerA.id, type: "REVENUE", counterpartyName: "Atleta de teste",
        category: "Teste", description: "Mensalidade de teste", amountCents: 3000, frequency: "MONTHLY",
        startsAt: new Date(2030, 0, 1), nextDueDate: new Date(2030, 1, 1),
      } });
      await tx.financialEntry.create({ data: {
        arenaId: arenaA.id, recurrenceId: recurrence.id, type: "REVENUE", category: "Teste",
        description: "Mensalidade vinculada pela recorrência", amountCents: 3000, status: "PENDING",
        dueDate: new Date(2030, 0, 7),
      } });
      const checkoutCharge = await linkedEntry(4000);
      await tx.onlinePaymentCheckout.create({ data: {
        arenaId: arenaA.id, playerId: playerA.id, amountCents: 4000,
        items: { create: { financialEntryId: checkoutCharge.id, amountCents: 4000 } },
      } });
      assert.deepEqual(await getBookingDelinquency(tx, arenaA.id, playerA.id, 3, today), { blocked: true, count: 4, outstandingCents: 15000 });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const playerB = await tx.player.create({ data: { arenaId: arenaB.id, name: "Cliente descartável de outra arena" }, select: { id: true } });
      await tx.financialEntry.create({ data: {
        arenaId: arenaB.id, playerId: playerB.id, type: "REVENUE", category: "Teste", description: "Cobrança descartável de outra arena",
        amountCents: 9000, status: "PENDING", dueDate: new Date(2030, 0, 1),
      } });
      assert.deepEqual(await getBookingDelinquency(tx, arenaB.id, playerA.id, 1, today), { blocked: false, count: 0, outstandingCents: 0 });
      assert.deepEqual(await getBookingDelinquency(tx, arenaB.id, playerB.id, 1, today), { blocked: true, count: 1, outstandingCents: 9000 });
      assert.deepEqual(await getBookingDelinquency(tx, arenaA.id, playerA.id, 1, today), { blocked: false, count: 0, outstandingCents: 0 });
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
