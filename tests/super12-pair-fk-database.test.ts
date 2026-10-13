import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("remover uma dupla do Super 12 preserva a chave do mata-mata", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback do Super 12 descartável");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const creator = await tx.player.findFirstOrThrow({ where: { arenaId: arena.id, id: "goal-athlete-a" }, select: { id: true } });
      const event = await tx.super12Event.create({ data: { arenaId: arena.id, creatorId: creator.id, name: "Super 12 descartável GOAL" }, select: { id: true } });
      const home = await tx.super12Pair.create({ data: { eventId: event.id, name: "Dupla A", drawOrder: 1 }, select: { id: true } });
      const away = await tx.super12Pair.create({ data: { eventId: event.id, name: "Dupla B", drawOrder: 2 }, select: { id: true } });
      const match = await tx.super12Match.create({ data: { eventId: event.id, roundOrder: 1, stage: "KNOCKOUT", homePairId: home.id, awayPairId: away.id }, select: { id: true } });

      await tx.super12Pair.delete({ where: { id: home.id } });
      assert.deepEqual(await tx.super12Match.findUniqueOrThrow({ where: { id: match.id }, select: { homePairId: true, awayPairId: true } }), { homePairId: null, awayPairId: away.id });
      await tx.super12Pair.delete({ where: { id: away.id } });
      assert.deepEqual(await tx.super12Match.findUniqueOrThrow({ where: { id: match.id }, select: { homePairId: true, awayPairId: true } }), { homePairId: null, awayPairId: null });
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
