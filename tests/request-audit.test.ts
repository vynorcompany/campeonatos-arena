import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
const { createAuditedHandler, shouldAudit, operationOf } = createRequire(import.meta.url)("../scripts/request-audit.cjs");
const token = "synthetic-session-token";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function fixture() {
  const records = new Map<string, any>();
  const contexts: unknown[][] = [];
  const tx = { $executeRaw: async (...values: unknown[]) => { contexts.push(values); }, auditEvent: {
    create: async ({ data }: any) => { records.set(data.id, structuredClone(data)); return data; },
    update: async ({ where, data }: any) => { records.set(where.id, { ...records.get(where.id), ...structuredClone(data) }); return records.get(where.id); },
  } };
  return { records, contexts, tx, db: {
    $transaction: async (operation: any) => operation(tx),
    session: { findUnique: async ({ where }: any) => where.token === digest(token) ? { expiresAt: new Date(Date.now() + 3600000), user: { id: "operator", name: "Operador", systemRole: "VIEWER", memberships: [{ arenaId: "arena-a" }] } } : null },
  } };
}
async function settled(records: Map<string, any>) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ([...records.values()].every(record => record.details.stage !== "REQUESTED")) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("O resultado HTTP não foi persistido na auditoria.");
}
async function server(handler: any, operation: (url: string) => Promise<void>) {
  const http = createServer(handler);
  await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert(address && typeof address !== "string");
  try { await operation(`http://127.0.0.1:${address.port}`); }
  finally { http.closeAllConnections(); await new Promise<void>(resolve => http.close(() => resolve())); }
}

test("auditoria central registra ações e acessos sem armazenar corpo, senha, token ou query", async () => {
  const state = fixture();
  const manifest = { node: { "action-reference": { exportedName: "updateSupplierAction" } } };
  const handler = createAuditedHandler((_req: any, res: any) => { res.statusCode = 403; res.end("negado"); }, { db: state.db, manifest });
  await server(handler, async url => {
    const response = await fetch(`${url}/financeiro/configuracoes/fornecedores?secret=never-store-this`, { method: "POST", headers: { cookie: `padel_session=${token}; padel_arena=forged-other-arena`, "next-action": "action-reference", "content-type": "text/plain" }, body: "password=never-store-this" });
    assert.equal(response.status, 403);
    await settled(state.records);
  });
  const [record] = [...state.records.values()];
  assert.equal(record.arenaId, "arena-a");
  assert.equal(record.actorId, "operator");
  assert.equal(record.action, "ACTION:updateSupplierAction");
  assert.equal(record.details.stage, "RESPONDED");
  assert.equal(record.details.statusCode, 403);
  assert.equal(record.details.path, "/financeiro/configuracoes/fornecedores");
  assert.doesNotMatch(JSON.stringify(record), /never-store-this|synthetic-session-token|password|forged-other-arena/);
  assert(state.contexts.some(values => values.includes(record.id)));
});

test("uma solicitação sem sessão fica registrada sem atribuir uma arena arbitrária", async () => {
  const state = fixture();
  await server(createAuditedHandler((_req: any, res: any) => { res.end("ok"); }, { db: state.db }), async url => {
    assert.equal((await fetch(`${url}/novo-recurso`, { headers: { cookie: "padel_arena=forged-other-arena" } })).status, 200);
    await settled(state.records);
  });
  const [record] = [...state.records.values()];
  assert.equal(record.arenaId, null);
  assert.equal(record.actorId, "ANONYMOUS");
  assert.equal(record.action, "PAGE_VIEW");
});

test("falha ao registrar a tentativa impede executar a ação e não expõe o erro do banco", async () => {
  const state = fixture();
  state.tx.auditEvent.create = async () => { throw new Error("database-password-not-public"); };
  let executed = false;
  await server(createAuditedHandler((_req: any, res: any) => { executed = true; res.end("executado"); }, { db: state.db, onError() {} }), async url => {
    const response = await fetch(`${url}/comandas`, { method: "POST" });
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /database-password-not-public/);
  });
  assert.equal(executed, false);
});

test("login é atribuído à sessão criada pela resposta; não perde o registro anônimo inicial", async () => {
  const state = fixture();
  await server(createAuditedHandler((_req: any, res: any) => { res.setHeader("Set-Cookie", `padel_session=${token}; HttpOnly`); res.statusCode = 303; res.setHeader("Location", "/painel"); res.end(); }, { db: state.db }), async url => {
    assert.equal((await fetch(`${url}/login`, { method: "POST", redirect: "manual" })).status, 303);
    await settled(state.records);
  });
  assert.equal(state.records.size, 1);
  const [record] = [...state.records.values()];
  assert.equal(record.actorName, "Operador");
  assert.equal(record.arenaId, "arena-a");
});

test("rotas novas, downloads e APIs entram na auditoria; somente infraestrutura e prefetch são excluídos", () => {
  for (const url of ["/comandas", "/api/agents/finance", "/api/cron/billing", "/relatorios/caixa", "/recurso-futuro"]) assert(shouldAudit({ url, headers: {} }));
  for (const url of ["/_next/static/chunk.js", "/api/health", "/favicon.ico"]) assert.equal(shouldAudit({ url, headers: {} }), false);
  assert.equal(shouldAudit({ url: "/comandas", headers: { "next-router-prefetch": "1" } }), false);
  assert.equal(operationOf({ url: "/api/future", method: "DELETE", headers: {} }, {}), "API:DELETE");
});

test("sessões simultâneas atribuem a ação do portal ao cliente e a API à chave usada", async () => {
  const state = fixture();
  const db: any = state.db; const tx: any = state.tx;
  db.playerSession = { findFirst: async () => ({ playerAccount: { id: "account", arenaId: "arena-client", playerId: "client", identityId: null }, athleteIdentityId: null }) };
  db.arena = { findUnique: async () => ({ id: "arena-client" }) };
  tx.player = { findUnique: async () => ({ name: "Cliente do teste" }) };
  db.$queryRaw = async () => [{ id: "key", arenaId: "arena-agent" }];
  tx.agentApiKey = { findUnique: async () => ({ name: "Integração de teste" }) };
  await server(createAuditedHandler((_req: any, res: any) => { res.end("ok"); }, { db }), async url => {
    await fetch(`${url}/arena-client/portaldoatleta/agendamento`, { headers: { cookie: `padel_session=${token}; arena_player_session=client-token` } });
    await fetch(`${url}/api/agents/clients`, { headers: { cookie: `padel_session=${token}`, authorization: `Bearer arena_${"c".repeat(64)}` } });
    await settled(state.records);
  });
  assert.deepEqual([...state.records.values()].map(row => [row.actorId, row.arenaId]), [["client", "arena-client"], ["key", "arena-agent"]]);
});

test("erro inesperado do handler preserva a tentativa e registra interrupção sem expor detalhes", async () => {
  const state = fixture();
  await server(createAuditedHandler(async () => { throw new Error("private-error-content"); }, { db: state.db }), async url => {
    const response = await fetch(`${url}/falha`, { method: "POST" });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /private-error-content/);
    await settled(state.records);
  });
  const [record] = [...state.records.values()];
  assert.equal(record.details.stage, "INTERRUPTED");
  assert.equal(record.details.statusCode, 500);
});

test("administrador da agência sem vínculo explícito usa a arena padrão e separa ações da agência", async () => {
  const state = fixture(); const db: any = state.db;
  db.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 60000), user: { id: "agency", name: "Administrador", systemRole: "ADMIN", memberships: [] } });
  db.arena = { findFirst: async () => ({ id: "first-arena" }) };
  await server(createAuditedHandler((_req: any, res: any) => { res.end("ok"); }, { db }), async url => {
    for (const path of ["/agenda", "/agencia/arenas"]) await fetch(url + path, { headers: { cookie: `padel_session=${token}` } });
    await settled(state.records);
  });
  assert.deepEqual([...state.records.values()].map(row => [row.actorId, row.arenaId]), [["agency", "first-arena"], ["agency", null]]);
});

test("conclusão de uma exclusão de arena preserva o evento que perdeu o vínculo por SET NULL", async () => {
  const state = fixture();
  await server(createAuditedHandler((_req: any, res: any) => {
    for (const [id, record] of state.records) state.records.set(id, { ...record, arenaId: null });
    res.end("arena excluída");
  }, { db: state.db }), async url => {
    await fetch(`${url}/arena`, { method: "POST", headers: { cookie: `padel_session=${token}` } });
    await settled(state.records);
  });
  const [record] = [...state.records.values()];
  assert.equal(record.arenaId, null);
  assert.equal(record.actorId, "operator");
  assert.equal(record.details.stage, "RESPONDED");
});
