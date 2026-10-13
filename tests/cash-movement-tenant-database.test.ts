import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("nova movimentação não aceita sessão de outra arena; registro legado permanece visível sem expor sessão", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const registerIds: string[] = [];
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const referenceDate = new Date("2038-01-01T00:00:00Z");
    const registerA = await admin.cashRegister.create({ data: { arenaId: arenaA.id, referenceDate, status: "CLOSED", openingNotes: "GOAL isolamento" } });
    registerIds.push(registerA.id);
    const registerB = await admin.cashRegister.create({ data: { arenaId: arenaB.id, referenceDate, status: "CLOSED", openingNotes: "GOAL isolamento" } });
    registerIds.push(registerB.id);

    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const movement = await tx.cashMovement.create({ data: { arenaId: arenaA.id, registerId: registerA.id, type: "SUPPLY", amountCents: 100, description: "GOAL próprio" } });
      assert.equal((await tx.cashMovement.findFirst({ where: { id: movement.id }, include: { register: { select: { arenaId: true } } } }))?.register.arenaId, arenaA.id);
    });

    await assert.rejects(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      return tx.cashMovement.create({ data: { arenaId: arenaA.id, registerId: registerB.id, type: "SUPPLY", amountCents: 100, description: "GOAL externo" } });
    }), /42501|row-level security|segurança no nível de linha/);
    const malformed = await admin.cashMovement.create({ data: { arenaId: arenaA.id, registerId: registerB.id, type: "SUPPLY", amountCents: 100, description: "GOAL legado externo" } });
    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await tx.cashMovement.findFirst({ where: { id: malformed.id }, select: { id: true } }))?.id, malformed.id);
      assert.equal(await tx.cashRegister.findFirst({ where: { id: registerB.id }, select: { id: true } }), null);
    });
  } finally {
    if (registerIds.length) await admin.cashRegister.deleteMany({ where: { id: { in: registerIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
