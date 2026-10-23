import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { auditedDatabase } from "../src/lib/audit/database-client";
import type { AuditRequestContext } from "../src/lib/audit/request-context";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const u = new URL(url); return u.hostname === "127.0.0.1" && u.port === "55433" && u.pathname === "/arena_goal"; } catch { return false; } })();
test("journal cobre tabelas, transações, lotes, rotinas automáticas e não persiste credenciais", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const db = auditedDatabase(admin);
  const contexts = new AsyncLocalStorage<AuditRequestContext>();
  const symbol = Symbol.for("arena.http-audit.context");
  const globals = globalThis as any; const previous = globals[symbol]; globals[symbol] = contexts;
  const actorId = `journal-${randomUUID()}`; const requestId = randomUUID();
  const email = `${randomUUID()}@example.test`; const secret = `secret-${randomUUID()}`;
  const context: AuditRequestContext = { actorId, actorName: "Operador teste", requestId, arenaId: null, arenaIds: new Set() };
  let id = "";
  try {
    const missing = await admin.$queryRaw<Array<{ relname: string }>>`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition AND c.relname NOT IN ('AuditEvent','_prisma_migrations') AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=c.oid AND tgname='journal_database_change')`;
    assert.deepEqual(missing, []);
    await contexts.run(context, async () => {
      const pending = db.user.create({ data: { name: "Journal test", email, passwordHash: secret } });
      assert.equal(await admin.user.count({ where: { email } }), 0, "write remains lazy");
      const user = await pending; id = user.id;
      const [read, updated] = await db.$transaction([
        db.user.findUniqueOrThrow({ where: { id } }),
        db.user.update({ where: { id }, data: { name: "Journal edited" } })
      ]);
      assert.equal(read.id, id); assert.equal(updated.name, "Journal edited");
      await assert.rejects(db.$transaction(async tx => {
        await tx.user.update({ where: { id }, data: { name: "Must roll back" } });
        throw new Error("rollback-proof");
      }), /rollback-proof/);
      await assert.rejects(db.$transaction([
        db.user.update({ where: { id }, data: { name: "Batch must roll back" } }),
        db.user.update({ where: { id: randomUUID() }, data: { name: "Missing" } })
      ]));
      await db.user.updateMany({ where: { id }, data: { name: "Bulk update" } });
      await db.$executeRaw`UPDATE "User" SET "name" = 'Raw journal update' WHERE id = ${id}`;
    });
    assert.equal((await admin.user.findUniqueOrThrow({ where: { id } })).name, "Raw journal update");
    let rows = await admin.auditEvent.findMany({ where: { entityId: id, action: { startsWith: "DB:" } }, orderBy: { createdAt: "asc" } });
    assert.equal(rows.length, 4);
    assert(rows.every(row => row.actorId === actorId && (row.details as any).requestId === requestId));
    assert(!JSON.stringify(rows).includes(secret)); assert(!JSON.stringify(rows).includes(email));
    assert(!JSON.stringify(rows).includes("Must roll back")); assert(!JSON.stringify(rows).includes("Batch must roll back"));
    await db.user.update({ where: { id }, data: { name: "Automatic job" } });
    rows = await admin.auditEvent.findMany({ where: { entityId: id, actorId: "SYSTEM", action: "DB:UPDATE:User" } });
    assert.equal(rows.length, 1, "background write remains covered without request context");
    await contexts.run(context, () => db.user.delete({ where: { id } }));
    assert.equal(await admin.auditEvent.count({ where: { entityId: id, actorId, action: "DB:DELETE:User" } }), 1);
    const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
    const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
    try { await assert.rejects(runtime.auditEvent.deleteMany({ where: { entityId: id } }), /permission|permissão|42501/i); } finally { await runtime.$disconnect(); }
  } finally {
    globals[symbol] = previous;
    if (id) { await admin.user.deleteMany({ where: { id } }); await admin.auditEvent.deleteMany({ where: { entityId: id } }); }
    await admin.$disconnect();
  }
});
