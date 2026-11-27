import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/management-utilities";
function load(path: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const exports: Record<string, Function> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, Date, ...globals, require(name: string) { if (name === "server-only") return {}; if (name in dependencies) return dependencies[name]; throw Error("Unexpected dependency " + name); } });
  return exports;
}
function core(arenaId: string | null = "own") {
  let subscription: unknown = null, delinquency: unknown = null, settings: unknown = null;
  const queries: any[] = [], guards: string[] = [];
  const exports = load("../src/lib/backend/services/management-utilities.ts", {
    "./management-session": { requireAuth: async () => { guards.push("auth"); return { arenaId }; }, requireArenaAccess: async () => { guards.push("arena"); return { arenaId }; } },
    "@/lib/prisma": { prisma: { agencySubscription: { findUnique: async (args: unknown) => { queries.push(args); return subscription; } } } },
    "@/lib/arena-database": { arenaDatabase: (id: string) => { assert.equal(id, "own"); return { arenaOperationalSettings: { findUnique: async (args: unknown) => { queries.push(args); return settings; } } }; } },
    "@/lib/finance/agency-delinquency": { getAgencyDelinquency: async (id: string) => { assert.equal(id, "own"); return delinquency; } },
    "../contracts/management-utilities": contracts,
  });
  return { exports, queries, guards, subscription: (value: unknown) => subscription = value, delinquency: (value: unknown) => delinquency = value, settings: (value: unknown) => settings = value };
}
test("access summary keeps blocked users authenticated without looping through the arena gate and projects own billing data only", async () => {
  const f = core();
  f.subscription({ plan: { isTrial: true }, trialEndsAt: new Date("2000-01-01"), invoices: [{ checkoutUrl: "https://checkout.example.test/own", secret: "hidden" }] });
  assert.deepEqual(JSON.parse(JSON.stringify(await f.exports.resolveAccessUnavailable())), { reason: "TRIAL_ENDED", checkoutUrl: "https://checkout.example.test/own" });
  f.delinquency({ blocked: true, secret: "hidden" }); assert.equal((await f.exports.resolveAccessUnavailable()).reason, "OVERDUE");
  assert.ok(f.guards.every(guard => guard === "auth")); assert.ok(f.queries.every(query => query.where.arenaId === "own" && query.select.invoices.take === 1 && query.select.invoices.where.status === "PENDING"));
  f.subscription({ plan: { isTrial: true }, trialEndsAt: new Date("2099-01-01"), invoices: [] }); f.delinquency(null); assert.equal((await f.exports.resolveAccessUnavailable()).reason, "UNAVAILABLE");
  const empty = core(null); assert.equal((await empty.exports.resolveAccessUnavailable()).checkoutUrl, null); assert.equal(empty.queries.length, 0);
});
test("print test remains available to existing arena users and reads only own printer settings with existing defaults", async () => {
  const f = core(); assert.deepEqual(JSON.parse(JSON.stringify(await f.exports.resolvePrinterTest())), { printerPaper: "80MM", printerCopies: 1 });
  f.settings({ printerPaper: "58MM", printerCopies: 3 }); assert.equal((await f.exports.resolvePrinterTest()).printerCopies, 3);
  assert.ok(f.guards.every(guard => guard === "arena")); assert.ok(f.queries.every(query => query.where.arenaId === "own" && Object.keys(query.select).sort().join() === "printerCopies,printerPaper"));
});
test("utility contracts exclude private billing records and unsafe invoice links", () => {
  for (const url of ["javascript:alert(1)", "https://user:secret@example.test", "//evil.test"]) assert.equal(contracts.accessUnavailableSchema.safeParse({ reason: "OVERDUE", checkoutUrl: url }).success, false);
  assert.equal(contracts.accessUnavailableSchema.safeParse({ reason: "OVERDUE", checkoutUrl: null, invoices: [] }).success, false);
  assert.equal(contracts.printerTestSchema.safeParse({ printerPaper: "A4", printerCopies: 1, arenaId: "forged" }).success, false);
});
test("utility transport sends management cookies only, fails closed without retry and cannot accept extra backend fields", async () => {
  for (const invalid of [false, true]) {
    const calls: any[] = [];
    const f = load("../src/lib/management/utilities.ts", {
      "@/lib/backend/management-context-client": { managementCookieHeader: async () => "padel_session=synthetic" },
      "@/lib/backend/http-client": { readBackendContract: async (...args: any[]) => { calls.push(args); return args[2].parse({ reason: "UNAVAILABLE", checkoutUrl: null, ...(invalid ? { passwordHash: "private" } : {}) }); } },
      "@/lib/backend/contracts/management-utilities": contracts,
    }, { process: { env: { VX4_BACKEND_ORIGIN: "http://backend.test" } } });
    if (invalid) await assert.rejects(f.getAccessUnavailable(), { message: "Não foi possível consultar as informações da arena." }); else assert.equal((await f.getAccessUnavailable()).reason, "UNAVAILABLE");
    assert.equal(calls.length, 1); assert.equal(calls[0][1], "/api/management/utilities/access"); assert.equal(calls[0][3].cookie, "padel_session=synthetic");
  }
});
test("utility HTTP boundary rejects caller scopes, preserves login/access redirects and hides infrastructure errors", async () => {
  let signedIn = true, blocked = false, broken = false; const reads: string[] = [];
  const f = load("../src/app/api/management/utilities/[view]/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, options: ResponseInit) => Response.json(body, options) } },
    "@/lib/backend/services/management-session": { requireAuth: async () => { if (!signedIn) throw Error("LOGIN_REDIRECT"); }, requireArenaAccess: async () => { if (blocked) throw Error("ACCESS_REDIRECT"); } },
    "@/lib/backend/services/management-utilities": { resolveAccessUnavailable: async () => { reads.push("access"); if (broken) throw Error("private database password"); return { reason: "OVERDUE", checkoutUrl: null }; }, resolvePrinterTest: async () => { reads.push("printer"); return { printerPaper: "A4", printerCopies: 1 }; } },
  });
  const get = (view: string, query = "") => f.GET({ nextUrl: new URL("http://backend.test/api/management/utilities/" + view + query) }, { params: Promise.resolve({ view }) });
  for (const query of ["?arenaId=foreign", "?arenaId=a&arenaId=b", "?userId=forged", "?view=printer"]) assert.equal((await get("access", query)).status, 400);
  assert.equal((await get("unknown")).status, 404); assert.equal(reads.length, 0);
  blocked = true; assert.equal((await get("access")).status, 200); await assert.rejects(get("printer"), /ACCESS_REDIRECT/);
  signedIn = false; await assert.rejects(get("access"), /LOGIN_REDIRECT/); signedIn = true;
  broken = true; const response = await get("access"); assert.equal(response.status, 503); assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie"); assert.equal((await response.text()).includes("password"), false);
});
