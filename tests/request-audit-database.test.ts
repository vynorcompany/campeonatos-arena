import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import test from "node:test";
import { noteAuditArena } from "../src/lib/audit/request-context";
const { createAuditedHandler } = createRequire(import.meta.url)("../scripts/request-audit.cjs");
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const u = new URL(url); return u.hostname === "127.0.0.1" && u.port === "55433" && u.pathname === "/arena_goal"; } catch { return false; } })();
test("auditoria HTTP persiste autor e resultado, mantém isolamento e protege registros globais", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const token = randomUUID(); const route = `/audit-test-${randomUUID()}`;
  let userId = ""; const ids: string[] = [];
  let observedArena = "";
  const http = createServer(createAuditedHandler((req: any, res: any) => { if (req.headers["x-test-observe-arena"] === "yes") noteAuditArena(observedArena); res.statusCode = 403; res.end("consulta rejeitada"); }, { db: runtime, onError() { throw new Error("Não foi possível gravar a auditoria real."); } }));
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    observedArena = arenaA.id;
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const user = await admin.user.create({ data: { name: "Consulta de auditoria descartável", email: `${randomUUID()}@example.test`, passwordHash: "test-only", systemRole: "VIEWER" } }); userId = user.id;
    await admin.arenaMember.create({ data: { arenaId: arenaA.id, userId, role: "STAFF" } });
    await admin.session.create({ data: { userId, token: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60000) } });
    await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
    const address = http.address(); assert(address && typeof address !== "string");
    const endpoint = `http://127.0.0.1:${address.port}${route}`;
    assert.equal((await fetch(endpoint, { headers: { cookie: `padel_session=${token}; padel_arena=${arenaB.id}` } })).status, 403);
    assert.equal((await fetch(endpoint, { method: "POST" })).status, 403);
    assert.equal((await fetch(endpoint, { method: "PUT", headers: { "x-test-observe-arena": "yes" } })).status, 403);
    let events: Awaited<ReturnType<typeof admin.auditEvent.findMany>> = [];
    for (let attempt = 0; attempt < 100; attempt++) {
      events = await admin.auditEvent.findMany({ where: { details: { path: ["path"], equals: route } } });
      if (events.length === 3 && events.every(row => (row.details as any).stage === "RESPONDED")) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    ids.push(...events.map(event => event.id));
    assert.equal(events.length, 3);
    const identified = events.find(row => row.actorId === user.id)!;
    const anonymous = events.find(row => row.actorId === "ANONYMOUS" && row.arenaId === null)!;
    assert.equal(identified.arenaId, arenaA.id);
    assert.equal(anonymous.arenaId, null);
    const observed = events.find(row => row.actorId === "ANONYMOUS" && row.arenaId === arenaA.id)!;
    assert(observed);
    assert.equal((observed.details as any).affectedArenaCount, 1);
    assert.equal((identified.details as any).statusCode, 403);
    await runtime.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.auditEvent.findUnique({ where: { id: identified.id } }), null);
      assert.equal(await tx.auditEvent.findUnique({ where: { id: anonymous.id } }), null);
      assert.equal(await tx.auditEvent.findUnique({ where: { id: observed.id } }), null);
      assert.equal((await tx.auditEvent.updateMany({ where: { id: identified.id }, data: { actorName: "Invasão" } })).count, 0);
      await tx.$executeRaw`SELECT set_config('app.audit_agency', 'true', true)`;
      assert.equal((await tx.auditEvent.findUnique({ where: { id: anonymous.id } }))?.id, anonymous.id);
    });
    assert.equal(await runtime.auditEvent.findUnique({ where: { id: anonymous.id } }), null);
    await assert.rejects(runtime.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.audit_request_id', ${identified.id}, true)`;
      return tx.auditEvent.update({ where: { id: identified.id }, data: { action: "ALTERADO" } });
    }), /permission|permissão|42501/i);
  } finally {
    http.closeAllConnections();
    if (http.listening) await new Promise<void>(resolve => http.close(() => resolve()));
    await admin.auditEvent.deleteMany({ where: { OR: [{ id: { in: ids } }, { details: { path: ["path"], equals: route } }] } });
    if (userId) await admin.user.delete({ where: { id: userId } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
