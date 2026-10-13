import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("movimentações de crédito e configurações online não vazam para outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback dos créditos de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const playerB = await tx.player.create({ data: { arenaId: arenaB.id, name: "Cliente externo descartável", phone: `55${Date.now()}` } });
      const foreignMovement = await tx.clientBalanceMovement.create({ data: { arenaId: arenaB.id, playerId: playerB.id, kind: "MONEY", amountCents: 100, reason: "Crédito externo descartável" } });
      const foreignSettings = await tx.onlinePaymentSettings.create({ data: { arenaId: arenaB.id, provider: "NONE" } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const playerA = await tx.player.create({ data: { arenaId: arenaA.id, name: "Cliente próprio descartável", phone: `54${Date.now()}` } });
      const ownMovement = await tx.clientBalanceMovement.create({ data: { arenaId: arenaA.id, playerId: playerA.id, kind: "MONEY", amountCents: 200, reason: "Crédito próprio descartável" } });
      assert.equal((await tx.clientBalanceMovement.findFirst({ where: { id: ownMovement.id } }))?.id, ownMovement.id);
      assert.equal(await tx.clientBalanceMovement.findFirst({ where: { id: foreignMovement.id } }), null);
      assert.equal(await tx.onlinePaymentSettings.findFirst({ where: { id: foreignSettings.id } }), null);
      await tx.$executeRaw`SELECT set_config('app.arena_id', '', true)`;
      assert.equal(await tx.clientBalanceMovement.findFirst({ where: { id: ownMovement.id } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("movimentação de crédito rejeita cliente de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do crédito cruzado de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const player = await tx.player.create({ data: { arenaId: arenaB.id, name: "Cliente externo descartável", phone: `53${Date.now()}` } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.clientBalanceMovement.create({ data: { arenaId: arenaA.id, playerId: player.id, kind: "MONEY", amountCents: 100, reason: "Crédito inválido" } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
