import assert from "node:assert/strict";
import test from "node:test";
import { comandaInputSchema, comandaOutcomeSchema } from "../src/lib/backend/contracts/comanda";
import { ComandaOperationError, publicComandaError } from "../src/lib/backend/comanda-operation-error";
import { FinanceOperationError } from "../src/lib/finance/action-error";
import { comandaFields, portalComandaOperations } from "../src/lib/backend/contracts/comanda";
import { backendOrigin } from "../src/lib/backend/http-client";
test("comanda contracts forbid caller authority, duplicate scalars and unexpected financial result data", () => {
  assert.equal(comandaInputSchema("finish").safeParse({ fields: { comandaId: ["own"], payments: ["[]"] } }).success, true);
  for (const fields of [{ arenaId: ["foreign"] }, { actorId: ["forged"] }, { comandaId: ["one", "two"] }]) assert.equal(comandaInputSchema("finish").safeParse({ fields }).success, false);
  assert.equal(comandaInputSchema("portal-order").safeParse({ fields: { arenaSlug: ["own"], items: ["[]"], playerId: ["other"] } }).success, false);
  assert.equal(comandaInputSchema("portal-open").safeParse({ fields: {} }).success, false);
  assert.equal(comandaOutcomeSchema.safeParse({ error: null, comanda: { comandaId: "own", openedAt: "2026-11-27T12:00:00.000Z", reused: false, passwordHash: "private" } }).success, false);
});
test("comanda HTTP separates athlete operations from management and enforces Origin, permission and administrator deletion", async () => {
  const { readFileSync } = await import("node:fs"); const { default: ts } = await import("typescript"); const { default: vm } = await import("node:vm");
  const { allowedFrontendOrigin } = await import("../src/lib/backend/origin-policy"); const { canPerformPermission } = await import("../src/lib/permissions"); const { ZodError } = await import("zod");
  const exports: Record<string, (...args: any[]) => Promise<Response>> = {};
  let permissions: string[] = [], admin = false, authenticated = true, calls = 0, failProvider = false;
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/comanda-route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Error, SyntaxError, process: { env: { VX4_FRONTEND_ORIGINS: '["https://frontend.invalid"]' } },
    require: (name: string) => name === "next/server" ? { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } } : name === "zod" ? { ZodError } : name.includes("management-session") ? { getArenaAccessDecision: async () => ({ auth: authenticated ? { arenaRole: admin ? "ADMIN" : "STAFF", systemRole: "VIEWER", editPermissions: permissions } : null, redirectTo: "/login" }) } : name.includes("player-session") ? { getPublicPlayerAuth: async () => authenticated ? { playerId: "own" } : null } : name.includes("permissions") ? { canPerformPermission } : name.includes("origin-policy") ? { allowedFrontendOrigin } : name.includes("json-body") ? { readBoundedJson: (request: Request) => request.json(), RequestBodyTooLargeError: class extends Error {} } : name.includes("contracts/comanda") ? { comandaFields, comandaInputSchema, portalComandaOperations } : name.includes("comanda-operation-error") ? { publicComandaError } : name.includes("services/comanda-mutations") ? { executeComandaMutation: async () => { calls++; if (failProvider) throw Error("private provider secret"); return { error: null }; } } : {},
  });
  const request = (fields: Record<string, string[]>, origin = "https://frontend.invalid") => new Request("https://backend.invalid/api", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ fields }) });
  const run = exports.handleComandaMutation;
  assert.equal((await run(request({}), "create", false)).status, 403);
  permissions = ["pos:command:create"];
  assert.equal((await run(request({}), "create", false)).status, 200);
  assert.equal((await run(request({ comandaId: ["own"] }), "delete", false)).status, 403);
  admin = true; assert.equal((await run(request({ comandaId: ["own"] }), "delete", false)).status, 200);
  assert.equal((await run(request({ arenaSlug: ["own"] }), "portal-open", false)).status, 404);
  assert.equal((await run(request({}), "create", true)).status, 404);
  assert.equal((await run(request({ arenaSlug: ["own"], actorId: ["forged"] }), "portal-open", true)).status, 400);
  assert.equal((await run(request({ arenaSlug: ["own"] }, "https://foreign.invalid"), "portal-open", true)).status, 403);
  authenticated = false; assert.equal((await run(request({ arenaSlug: ["own"] }), "portal-open", true)).status, 401);
  authenticated = true; failProvider = true;
  const privateFailure = await run(request({}), "create", false); assert.equal(privateFailure.status, 500); assert.equal((await privateFailure.text()).includes("private provider"), false);
  assert.equal(calls, 3);
});
test("comanda transport forwards the correct session for each namespace and never repeats uncertain writes", async () => {
  const { readFileSync } = await import("node:fs"); const { default: ts } = await import("typescript"); const { default: vm } = await import("node:vm");
  const exports: Record<string, (...args: any[]) => Promise<any>> = {}; let calls = 0, fail = false;
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/comanda-client.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, AbortSignal, Error,
    fetch: async (url: URL, init: RequestInit) => { calls++; const portal = url.pathname.includes("/portal/"); assert.equal(url.origin, "https://backend.invalid"); assert.equal((init.headers as Record<string, string>).cookie, portal ? "arena_player_session=athlete" : "padel_session=staff; padel_arena=own"); assert.equal(init.redirect, "error"); assert.equal(init.cache, "no-store"); if (fail) throw Error("uncertain write"); return Response.json({ error: null }); },
    require: (name: string) => name === "next/headers" ? { cookies: async () => ({ get: (key: string) => key === "arena_player_session" ? { value: "athlete" } : { value: "must-not-forward" } }), headers: async () => new Headers({ origin: "https://frontend.invalid" }) } : name.includes("management-context-client") ? { managementCookieHeader: async () => "padel_session=staff; padel_arena=own" } : name.includes("http-client") ? { backendOrigin } : name.includes("contracts/comanda") ? { comandaFields, comandaInputSchema, comandaOutcomeSchema, portalComandaOperations } : {},
  });
  await exports.remoteComandaMutation("https://backend.invalid", "create", { type: ["CLIENT"], playerId: ["own"] });
  await exports.remoteComandaMutation("https://backend.invalid", "portal-open", { arenaSlug: ["own"] });
  fail = true; await assert.rejects(exports.remoteComandaMutation("https://backend.invalid", "create", {}), /uncertain write/); assert.equal(calls, 3);
});
test("comanda errors expose intentional validation and suppress infrastructure details", () => {
  assert.equal(publicComandaError(new ComandaOperationError("Revise o desconto.")), "Revise o desconto.");
  assert.equal(publicComandaError(new FinanceOperationError("Selecione a conta bancária do recebimento.")), "Selecione a conta bancária do recebimento.");
  assert.equal(publicComandaError(new Error("Esta comanda não está mais aberta.")), "Esta comanda não está mais aberta.");
  assert.equal(publicComandaError(new Error("postgres://private-user:private-secret@private-host")), null);
});
