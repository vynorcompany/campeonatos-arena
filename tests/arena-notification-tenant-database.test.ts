import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("notificações da arena ficam invisíveis e imutáveis para outra arena", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback notification fixture");
  try {
    const ownArena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const otherArena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      const own = await tx.arenaNotification.create({ data: { arenaId: ownArena.id, title: "Aviso fictício A", message: "Somente arena A" } });
      const other = await tx.arenaNotification.create({ data: { arenaId: otherArena.id, title: "Aviso fictício B", message: "Somente arena B" } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${ownArena.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const visible = await tx.arenaNotification.findMany({ where: { id: { in: [own.id, other.id] } }, select: { id: true } });
      assert.deepEqual(visible.map((item) => item.id), [own.id]);
      assert.equal((await tx.arenaNotification.updateMany({ where: { id: other.id }, data: { readAt: new Date() } })).count, 0);
      assert.equal((await tx.arenaNotification.deleteMany({ where: { id: other.id } })).count, 0);
      await tx.arenaNotification.create({ data: { arenaId: ownArena.id, title: "Aviso fictício C", message: "Autorizado" } });
      await tx.$executeRawUnsafe("SAVEPOINT foreign_notification");
      await assert.rejects(tx.arenaNotification.create({ data: { arenaId: otherArena.id, title: "Aviso fictício D", message: "Proibido" } }), /42501|row-level security|segurança no nível de linha/);
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT foreign_notification");
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
