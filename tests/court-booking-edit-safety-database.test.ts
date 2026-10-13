import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { assertCourtBookingMayBeEdited } from "../src/lib/calendar/court-booking-edit-safety";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("edição da reserva não apaga nem reescreve cobrança paga, parcial ou iniciada online", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da edição financeira de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const otherArena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const playerId = "goal-athlete-a";
      const entry = await tx.financialEntry.create({ data: { arenaId: arena.id, playerId, type: "REVENUE", category: "Reserva", description: "Cobrança descartável", amountCents: 5000, source: "SCHEDULE_BOOKING", status: "PENDING" } });
      const booking = await tx.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "BOOKING", title: "Reserva descartável", startsAt: new Date("2036-06-01T14:00:00Z"), endsAt: new Date("2036-06-01T15:00:00Z"), participants: { create: { playerId, amountCents: 5000, financialEntryId: entry.id } } } });

      await assertCourtBookingMayBeEdited(tx, arena.id, booking.id);
      await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "PAID" } });
      await assert.rejects(assertCourtBookingMayBeEdited(tx, arena.id, booking.id), /pagamento ou cobrança online vinculada/);

      await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "PENDING" } });
      const settlement = await tx.financialSettlement.create({ data: { arenaId: arena.id, financialEntryId: entry.id, amountCents: 1000, paymentMethod: "PIX" } });
      await assert.rejects(assertCourtBookingMayBeEdited(tx, arena.id, booking.id), /pagamento ou cobrança online vinculada/);
      await tx.financialSettlement.delete({ where: { id: settlement.id } });

      await tx.financialEntry.update({ where: { id: entry.id }, data: { onlineProvider: "MERCADO_PAGO" } });
      await assert.rejects(assertCourtBookingMayBeEdited(tx, arena.id, booking.id), /pagamento ou cobrança online vinculada/);
      await tx.financialEntry.update({ where: { id: entry.id }, data: { onlineProvider: "" } });
      await tx.scheduleOccurrence.update({ where: { id: booking.id }, data: { status: "PENDING_PAYMENT" } });
      await assert.rejects(assertCourtBookingMayBeEdited(tx, arena.id, booking.id), /aguarda pagamento/);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${otherArena.id}, true)`;
      await assert.rejects(assertCourtBookingMayBeEdited(tx, otherArena.id, booking.id), /não encontrada nesta arena/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
