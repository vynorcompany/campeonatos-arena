import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(databaseUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("agendamento de chave não altera jogo de outra arena no banco", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const rollback = new Error("rollback do teste de chave entre arenas");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const tournamentB = await tx.tournament.create({ data: { arenaId: arenaB.id, name: "Chave isolada GOAL", publicSlug: `goal-bracket-${crypto.randomUUID()}` } });
      const categoryB = await tx.tournamentCategory.create({ data: { tournamentId: tournamentB.id, name: "Categoria GOAL", level: 1 } });
      const bracketB = await tx.categoryBracket.create({ data: { tournamentId: tournamentB.id, categoryId: categoryB.id } });
      const matchB = await tx.categoryBracketMatch.create({ data: { bracketId: bracketB.id, label: "Jogo GOAL", roundOrder: 1, stage: "FINAL" } });

      const outside = await tx.categoryBracketMatch.updateMany({
        where: { id: matchB.id, bracket: { tournament: { arenaId: arenaA.id } } },
        data: { scheduledTime: "19:00", courtName: "Quadra indevida" }
      });
      assert.equal(outside.count, 0);
      assert.equal((await tx.categoryBracketMatch.findUniqueOrThrow({ where: { id: matchB.id } })).scheduledTime, "");

      const inside = await tx.categoryBracketMatch.updateMany({
        where: { id: matchB.id, bracket: { tournament: { arenaId: arenaB.id } } },
        data: { scheduledTime: "20:00", courtName: "Quadra correta" }
      });
      assert.equal(inside.count, 1);
      assert.equal((await tx.categoryBracketMatch.findUniqueOrThrow({ where: { id: matchB.id } })).courtName, "Quadra correta");
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
