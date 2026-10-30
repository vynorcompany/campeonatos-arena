import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path: string, mocks: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const exports: Record<string, (...args: any[]) => any> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Response, Request, URL, Date, ...globals, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected dependency ${name}`); return mocks[name]; } });
  return exports;
}

test("refresh de fidelidade compartilha a consulta concorrente, respeita intervalo por arena e tenta novamente após falha", async () => {
  let now = 100000, calls = 0, fail = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const actions = load("../src/lib/services/refresh-loyalty-notifications.ts", {
    "@/lib/rls": { withArenaTransaction: async (arenaId: string, fn: (tx: unknown) => Promise<unknown>) => fn({ arenaId }) },
    "./client-loyalty-notifications": { syncClientLoyaltyNotifications: async () => { calls++; await gate; if (fail) throw new Error("Falha temporária"); } },
  }, { Date: { now: () => now } });
  const first = Array.from({ length: 10 }, () => actions.refreshLoyaltyNotifications("arena-a"));
  assert.equal(calls, 1); release(); await Promise.all(first);
  now += 59000; await actions.refreshLoyaltyNotifications("arena-a"); assert.equal(calls, 1);
  await actions.refreshLoyaltyNotifications("arena-b"); assert.equal(calls, 2);
  now += 1001; await actions.refreshLoyaltyNotifications("arena-a"); assert.equal(calls, 3);
  now += 60001; fail = true;
  await assert.rejects(actions.refreshLoyaltyNotifications("arena-a"), /Falha temporária/);
  fail = false; await actions.refreshLoyaltyNotifications("arena-a"); assert.equal(calls, 5);
});

test("alertas ao vivo exigem sessão e respeitam permissões de clientes e comandas", async () => {
  let auth: any = null;
  let modules = new Set<string>();
  const scans: string[] = [], queries: any[] = [];
  let rows: unknown[] = [];
  let requestCount = 0; const countQueries: any[] = [];
  const route = load("../src/app/api/notifications/live/route.ts", {
    "node:crypto": { createHash },
    "@/lib/auth/session": { getAuthContext: async () => auth },
    "@/lib/permissions": { canViewModule: (module: string) => modules.has(module) },
    "@/lib/arena-database": { arenaDatabase: (arenaId: string) => ({ arenaNotification: { count: async (query: unknown) => { countQueries.push({ arenaId, query }); return requestCount; }, findMany: async (query: unknown) => { queries.push({ arenaId, query }); return rows; } } }) },
    "@/lib/services/refresh-loyalty-notifications": { refreshLoyaltyNotifications: async (arenaId: string) => { scans.push(arenaId); } },
    "@/lib/services/client-loyalty-notifications": { loyaltyNotificationType: "LOYALTY_REWARD_READY" },
  });
  assert.equal((await route.GET(new Request("https://arena.test/api/notifications/live"))).status, 401); assert.equal(queries.length, 0);
  auth = { arenaId: "arena-a" };
  assert.deepEqual(await (await route.GET(new Request("https://arena.test/api/notifications/live"))).json(), { notifications: [], comandaRequestCount: 0 }); assert.equal(queries.length, 0); assert.equal(countQueries.length, 0);
  modules = new Set(["pos"]); await route.GET(new Request("https://arena.test/api/notifications/live"));
  assert.equal(scans.length, 0); assert.equal(queries[0].query.where.arenaId, "arena-a");
  assert.ok(!queries[0].query.where.type.in.includes("LOYALTY_REWARD_READY"));
  modules = new Set(["players"]); const response = await route.GET(new Request("https://arena.test/api/notifications/live"));
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(scans, ["arena-a"]);
  assert.equal(JSON.stringify(queries[1].query.where.type.in), JSON.stringify(["LOYALTY_REWARD_READY"]));
  modules = new Set(["players", "pos"]); auth = { arenaId: "arena-b" }; await route.GET(new Request("https://arena.test/api/notifications/live"));
  assert.equal(queries[2].arenaId, "arena-b"); assert.equal(queries[2].query.where.arenaId, "arena-b");
  assert.equal(queries[2].query.where.readAt, null); assert.equal(queries[2].query.take, 50);
  const unchanged = await route.GET(new Request("https://arena.test/api/notifications/live", { headers: { "If-None-Match": response.headers.get("ETag")! } }));
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");
  requestCount = 73;
  const countChanged = await route.GET(new Request("https://arena.test/api/notifications/live", { headers: { "If-None-Match": response.headers.get("ETag")! } }));
  assert.equal(countChanged.status, 200); assert.equal((await countChanged.json()).comandaRequestCount, 73);
  assert.equal(countQueries.at(-1).query.where.arenaId, "arena-b");
  assert.equal(countQueries.at(-1).query.where.readAt, null);
  assert.deepEqual(Array.from(countQueries.at(-1).query.where.type.in), ["COMANDA_OPEN_REQUEST", "COMANDA_REQUEST", "COMANDA_CLOSE_REQUEST"]);
  rows = [{ id: "notice-a", title: "Nova recompensa", message: "Meta atingida" }];
  const changed = await route.GET(new Request("https://arena.test/api/notifications/live", { headers: { "If-None-Match": response.headers.get("ETag")! } }));
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get("ETag"), response.headers.get("ETag"));
  assert.equal((await changed.json()).notifications[0].id, "notice-a");
  const scansBefore = scans.length;
  await route.GET(new Request("https://arena.test/api/notifications/live?scope=comandas"));
  assert.equal(scans.length, scansBefore);
  assert.deepEqual(Array.from(queries.at(-1).query.where.type.in), ["COMANDA_OPEN_REQUEST", "COMANDA_REQUEST", "COMANDA_CLOSE_REQUEST"]);
  modules = new Set(["players"]);
  assert.deepEqual(await (await route.GET(new Request("https://arena.test/api/notifications/live?scope=comandas"))).json(), { notifications: [], comandaRequestCount: 0 });
  assert.equal(scans.length, scansBefore);

});
