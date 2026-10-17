import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { loadClientLoyalty, loyaltyProgress } from "../src/lib/services/client-loyalty";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("resgates consomem visitas sem produzir saldo negativo", () => {
  assert.deepEqual(loyaltyProgress(7, -3, 4), { availableVisits: 4, availableRewards: 1 });
  assert.deepEqual(loyaltyProgress(1, -4, 4), { availableVisits: 0, availableRewards: 0 });
});

test("fidelidade conta só reservas concluídas desde a ativação, visitas avulsas e resgates da arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = testUrl.replace("postgres@", "arena_runtime@");
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback da fidelidade descartável");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const startedAt = new Date("2030-01-01T12:00:00.000Z");
      const now = new Date("2030-01-05T12:00:00.000Z");
      await tx.arena.update({ where: { id: arenaA.id }, data: { loyaltyEnabled: true, loyaltyStartedAt: startedAt, loyaltyVisitsRequired: 2, loyaltyRewardLabel: "Uma reserva cortesia" } });
      const makeBooking = async (end: Date, status: string, sourceType = "COURT_BOOKING", bookingTypeName = "Reserva") => tx.scheduleOccurrence.create({ data: {
        arenaId: arenaA.id, sourceType, bookingTypeName, title: "Reserva descartável de fidelidade",
        startsAt: new Date(end.getTime() - 60 * 60_000), endsAt: end, status,
        participants: { create: { playerId: "goal-athlete-a" } },
      } });
      await makeBooking(new Date("2030-01-02T12:00:00.000Z"), "SCHEDULED");
      await makeBooking(new Date("2030-01-03T12:00:00.000Z"), "CANCELED");
      await makeBooking(new Date("2029-12-31T12:00:00.000Z"), "SCHEDULED");
      await makeBooking(new Date("2030-01-06T12:00:00.000Z"), "SCHEDULED");
      await tx.loyaltyActivity.create({ data: { arenaId: arenaA.id, playerId: "goal-athlete-a", kind: "VISIT", visitsDelta: 1, createdByUserId: "goal-test", createdAt: new Date("2030-01-04T12:00:00.000Z") } });
      let state = await loadClientLoyalty(tx, arenaA.id, "goal-athlete-a", now);
      assert.deepEqual({ completed: state.completedReservations, manual: state.manualVisits, visits: state.availableVisits, rewards: state.availableRewards }, { completed: 1, manual: 1, visits: 2, rewards: 1 });
      await makeBooking(new Date("2030-01-04T10:00:00.000Z"), "SCHEDULED", "BOOKING", "reserva fixa");
      await makeBooking(new Date("2030-01-04T11:00:00.000Z"), "SCHEDULED", "ONLINE_BOOKING", "Reserva");
      await makeBooking(new Date("2030-01-04T12:00:00.000Z"), "PENDING_CONFIRMATION", "ONLINE_BOOKING", "Reserva");
      await makeBooking(new Date("2030-01-04T13:00:00.000Z"), "SCHEDULED", "BOOKING", "Aula");
      await makeBooking(new Date("2030-01-04T14:00:00.000Z"), "SCHEDULED", "BOOKING", "Liga");
      await makeBooking(new Date("2030-01-04T15:00:00.000Z"), "SCHEDULED", "LEAGUE", "Reserva");
      state = await loadClientLoyalty(tx, arenaA.id, "goal-athlete-a", now);
      assert.deepEqual({ completed: state.completedReservations, manual: state.manualVisits, visits: state.availableVisits, rewards: state.availableRewards }, { completed: 3, manual: 1, visits: 4, rewards: 2 });
      await tx.loyaltyActivity.create({ data: { arenaId: arenaA.id, playerId: "goal-athlete-a", kind: "REWARD", visitsDelta: -2, rewardLabel: "Uma reserva cortesia", createdByUserId: "goal-test", createdAt: new Date("2030-01-04T13:00:00.000Z") } });
      state = await loadClientLoyalty(tx, arenaA.id, "goal-athlete-a", now);
      assert.deepEqual({ redeemed: state.redeemedVisits, visits: state.availableVisits, rewards: state.availableRewards }, { redeemed: 2, visits: 2, rewards: 1 });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.loyaltyActivity.count({ where: { arenaId: arenaA.id, playerId: "goal-athlete-a" } }), 0);
      await assert.rejects(tx.loyaltyActivity.create({ data: { arenaId: arenaB.id, playerId: "goal-athlete-a", kind: "VISIT", visitsDelta: 1, createdByUserId: "goal-test" } }));
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
