import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { deleteComandaWithAudit } from "../src/lib/comandas/delete-with-audit";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = (() => { try { const url = new URL(databaseUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; } catch { return false; } })();
test("exclusão é isolada por arena, registra recibo e reverte se a auditoria falhar", { skip: !disposable }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const runtimeUrl = new URL(databaseUrl); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const other = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const auth = { arenaId: arena.id, userId: "goal-test", userName: "Operador de teste" };
    const create = async () => { const row = await admin.comanda.create({ data: { arenaId: arena.id, code: randomUUID(), label: "Exclusão de teste", type: "AVULSA" } }); ids.push(row.id); return row; };
    const run = (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
      return operation(tx);
    });
    const first = await create();
    await assert.rejects(run(other.id, tx => deleteComandaWithAudit(tx, { ...auth, arenaId: other.id }, first.id)), /não está disponível/);
    assert.ok(await admin.comanda.findUnique({ where: { id: first.id } }));
    await run(arena.id, tx => deleteComandaWithAudit(tx, auth, first.id));
    assert.equal(await admin.comanda.findUnique({ where: { id: first.id } }), null);
    const event = await admin.auditEvent.findFirstOrThrow({ where: { entityId: first.id } });
    assert.equal(event.action, "COMANDA_DELETED"); assert.equal(event.actorId, auth.userId); assert.equal(event.arenaId, arena.id);
    const second = await create();
    await assert.rejects(run(arena.id, tx => deleteComandaWithAudit(new Proxy(tx, { get(target, key) { if (key === "auditEvent") return { create: async () => { throw new Error("audit unavailable"); } }; return Reflect.get(target, key); } }), auth, second.id)), /audit unavailable/);
    assert.ok(await admin.comanda.findUnique({ where: { id: second.id } }));
    assert.equal(await admin.auditEvent.count({ where: { entityId: second.id } }), 0);
    await assert.rejects(run(arena.id, tx => tx.auditEvent.delete({ where: { id: event.id } })), /permission denied|row-level security|Record to delete does not exist/i);
  } finally {
    await admin.auditEvent.deleteMany({ where: { entityId: { in: ids } } });
    await admin.comanda.deleteMany({ where: { id: { in: ids } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
