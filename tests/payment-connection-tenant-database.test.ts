import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("credenciais de pagamento só são acessíveis no contexto da arena proprietária", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da conexão de pagamento de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreign = await tx.paymentConnection.create({ data: { arenaId: arenaB.id, provider: "GOAL_TEST", encryptedSecrets: "segredo externo descartável" } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const own = await tx.paymentConnection.create({ data: { arenaId: arenaA.id, provider: "GOAL_TEST", encryptedSecrets: "segredo próprio descartável" } });
      assert.equal((await tx.paymentConnection.findFirst({ where: { id: own.id } }))?.id, own.id);
      assert.equal(await tx.paymentConnection.findFirst({ where: { id: foreign.id } }), null);
      assert.equal((await tx.paymentConnection.updateMany({ where: { id: foreign.id }, data: { status: "CONNECTED" } })).count, 0);
      await tx.$executeRaw`SELECT set_config('app.arena_id', '', true)`;
      assert.equal(await tx.paymentConnection.findFirst({ where: { id: own.id } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
