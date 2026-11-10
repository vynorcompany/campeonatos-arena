import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { arenaWallClockToInstant } from "../src/lib/calendar/arena-wall-clock";
const url = process.env.ARENA_AGENT_TEST_DATABASE_URL ?? "";
const baseUrl = process.env.ARENA_AGENT_TEST_BASE_URL ?? "";
const enabled = (() => {
  try {
    const db = new URL(url), base = new URL(baseUrl);
    if (db.hostname !== "127.0.0.1" || base.hostname !== "127.0.0.1") return false;
    return (db.port === "55439" && db.pathname === "/arena_verify" && base.port === "3013") ||
      (db.port === "55433" && db.pathname === "/arena_goal" && base.port === "3015") ||
      (db.port === "55441" && db.pathname === "/arena_finwrite" && base.port === "3018");
  } catch { return false; }
})();
test("API aplica escopos e arena, revoga chaves e evita lançamentos duplicados", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const keyIds: string[] = [], entryIds: string[] = [];
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const other = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const otherPlayer = await admin.player.findFirstOrThrow({ where: { arenaId: other.id } });
    const createKey = async (scopes: string[], expired = false) => {
      const secret = `arena_${randomBytes(32).toString("hex")}`;
      const key = await admin.agentApiKey.create({ data: { arenaId: arena.id, name: "Agente de teste", prefix: secret.slice(0, 14), tokenHash: createHash("sha256").update(secret).digest("hex"), scopes, expiresAt: new Date(Date.now() + (expired ? -1 : 1) * 3600000) } });
      keyIds.push(key.id); return { key, secret };
    };
    const read = await createKey(["clients:read"]);
    const call = (resource: string, secret = "", init?: RequestInit) => fetch(`${baseUrl}/api/agents/${resource}`, { ...init, headers: { authorization: `Bearer ${secret}`, ...init?.headers } });
    assert.equal((await call("clients")).status, 401);
    assert.equal((await call("finance", read.secret)).status, 403);
    const clients = await call("clients", read.secret); assert.equal(clients.status, 200);
    const data = await clients.json(); assert.ok(data.data.length); assert.ok(data.data.every((client: { id: string }) => client.id !== otherPlayer.id));
    const writer = await createKey(["finance:write", "finance:read", "reports:read", "agents:read", "schedule:read", "teachers:read"]);
    const idempotency = randomUUID();
    const body = { description: "Teste API", category: "Teste", type: "REVENUE", amountCents: 1234 };
    const post = (value = body) => call("finance", writer.secret, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotency }, body: JSON.stringify(value) });
    const first = await post(); assert.equal(first.status, 201); const receipt = await first.json(); entryIds.push(receipt.data.id);
    const repeated = await post(); assert.equal(repeated.status, 200); assert.equal((await repeated.json()).data.id, receipt.data.id);
    assert.equal((await post({ ...body, amountCents: 1235 })).status, 409);
    assert.equal((await call("finance", writer.secret, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": randomUUID() }, body: JSON.stringify({ ...body, description: "x".repeat(64 * 1024) }) })).status, 413);
    assert.equal(await admin.financialEntry.count({ where: { id: receipt.data.id, arenaId: arena.id } }), 1);
    assert.equal(await admin.auditEvent.count({ where: { entityId: receipt.data.id, action: "FINANCIAL_ENTRY_CREATED" } }), 1);
    const invalid = await call("finance", writer.secret, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": randomUUID() }, body: JSON.stringify({ ...body, playerId: otherPlayer.id }) }); assert.equal(invalid.status, 400);
    const paidRequestId = randomUUID();
    const paidBody = { ...body, type: "EXPENSE", category: "Serviço agente teste", counterpartyName: "Fornecedor agente teste", competenceDate: "2026-10-01T12:00:00.000Z", description: "Pagamento informado", status: "PAID", paidAt: "2026-11-05T15:00:00.000Z", paymentMethod: "PIX" };
    const paidPost = (secret: string, value = paidBody) => call("finance", secret, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": paidRequestId }, body: JSON.stringify(value) });
    assert.equal((await paidPost(writer.secret)).status, 403);
    const settler = await createKey(["finance:write", "finance:read", "finance:settle"]);
    const paid = await paidPost(settler.secret); assert.equal(paid.status, 201);
    const paidReceipt = await paid.json(); entryIds.push(paidReceipt.data.id);
    assert.equal((await paidPost(settler.secret)).status, 200);
    assert.equal((await paidPost(settler.secret, { ...paidBody, paidAt: "2026-11-05T15:00:00Z" })).status, 200);
    assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: paidReceipt.data.id } }), 1);
    const lookup = await call(`finance?requestId=${paidRequestId}`, settler.secret); assert.equal(lookup.status, 200);
    const proof = await lookup.json(); assert.deepEqual(proof.source, { system: "arena", company: arena.id }); assert.equal(proof.state, "saved"); assert.equal(proof.entry.status, "PAID"); assert.equal(proof.entry.paymentMethod, "PIX"); assert.equal(proof.entry.amountCents, body.amountCents);
    assert.equal(proof.entry.counterpartyName, paidBody.counterpartyName);
    assert.equal(proof.entry.competenceDate, paidBody.competenceDate);
    assert.ok(proof.entry.supplierId);
    const storedSupplier = await admin.supplier.findFirstOrThrow({ where: { id: proof.entry.supplierId, arenaId: arena.id } });
    assert.equal(storedSupplier.name, paidBody.counterpartyName);
    assert.ok(await admin.financialCategory.findFirst({ where: { arenaId: arena.id, name: paidBody.category, active: true, type: "EXPENSE" } }));
    assert.equal((await paidPost(settler.secret, { ...paidBody, competenceDate: "2026-11-01T12:00:00.000Z" })).status, 409);
    assert.equal((await paidPost(settler.secret, { ...paidBody, counterpartyName: "Outro fornecedor" })).status, 409);
    assert.equal((await (await call(`finance?requestId=${paidRequestId}`, writer.secret)).json()).state, "not_found");
    assert.equal((await paidPost(settler.secret, { ...paidBody, paymentMethod: "CASH" })).status, 409);
    assert.equal((await paidPost(settler.secret, { ...paidBody, status: "PENDING" })).status, 400);
    await admin.agentApiKey.update({ where: { id: settler.key.id }, data: { revokedAt: new Date() } });
    assert.equal((await call(`finance?requestId=${paidRequestId}`, settler.secret)).status, 401);
    for (const resource of ["finance", "reports", "agents", "reservations", "teachers"]) { const response = await call(resource, writer.secret); assert.equal(response.status, 200, resource); assert.ok(!JSON.stringify(await response.json()).includes(writer.key.tokenHash)); }
    const storedSlot = await admin.scheduleOccurrence.findUnique({ where: { id: "visual-checkin-slot" } });
    if (storedSlot) {
      const slots = await (await call("reservations", writer.secret)).json();
      const exported = slots.data.find((row: { id: string }) => row.id === storedSlot.id);
      assert.ok(exported); assert.equal(exported.startsAt, arenaWallClockToInstant(storedSlot.startsAt).toISOString());
    }
    await admin.agentApiKey.update({ where: { id: read.key.id }, data: { revokedAt: new Date() } });
    assert.equal((await call("clients", read.secret)).status, 401);
    const expired = await createKey(["clients:read"], true); assert.equal((await call("clients", expired.secret)).status, 401);
  } finally {
    await admin.auditEvent.deleteMany({ where: { entityId: { in: [...entryIds, ...keyIds] } } });
    await admin.financialSettlement.deleteMany({ where: { financialEntryId: { in: entryIds } } });
    await admin.financialEntry.deleteMany({ where: { id: { in: entryIds } } });
    await admin.agentApiKey.deleteMany({ where: { id: { in: keyIds } } });
    await admin.$disconnect();
  }
});
