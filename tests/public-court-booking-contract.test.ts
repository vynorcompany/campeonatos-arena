import assert from "node:assert/strict";
import test from "node:test";
import { publicCourtBookingInputSchema, publicCourtBookingOutcomeSchema } from "../src/lib/backend/contracts/public-court-booking";
import { publicCourtBookingFields } from "../src/lib/backend/contracts/public-court-booking";
import { backendOrigin } from "../src/lib/backend/http-client";
test("public booking contract accepts repeated services but rejects identity injection and duplicate scalar fields", () => {
  const schema = publicCourtBookingInputSchema("create");
  assert.equal(schema.safeParse({ fields: { arenaSlug: ["own"], serviceIds: ["one", "two"] } }).success, true);
  for (const fields of [{ arenaSlug: ["own"], playerId: ["other"] }, { arenaSlug: ["own", "other"] }, { arenaSlug: ["own"], serviceIds: Array(13).fill("service") }, { arenaSlug: [""] }]) assert.equal(schema.safeParse({ fields }).success, false);
  assert.equal(publicCourtBookingInputSchema("payment").safeParse({ fields: { arenaSlug: ["own"], serviceIds: ["one"] } }).success, false);
});
test("public booking transport forwards only the athlete cookie and never retries an uncertain write", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const exports: Record<string, (...args: any[]) => any> = {};
  let calls = 0, failure = false, status = 200;
  const payload = { error: null, result: { checkoutUrl: "https://payment.invalid/checkout" } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/public-court-booking-client.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, AbortSignal, Error,
    fetch: async (url: URL, init: RequestInit) => {
      calls++; assert.equal(url.href, "https://backend.invalid/api/portal/bookings/actions/payment");
      assert.equal((init.headers as Record<string, string>).cookie, "arena_player_session=athlete-token");
      assert.equal((init.headers as Record<string, string>).origin, "https://frontend.invalid");
      assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
      if (failure) throw Error("uncertain write");
      return new Response(JSON.stringify(status === 200 ? payload : { error: "Sem acesso.", result: null }), { status });
    },
    require: (name: string) => name === "next/headers" ? { cookies: async () => ({ get: (key: string) => key === "arena_player_session" ? { value: "athlete-token" } : { value: "must-not-forward" } }), headers: async () => new Headers({ origin: "https://frontend.invalid" }) } : name === "./http-client" ? { backendOrigin } : name === "./contracts/public-court-booking" ? { publicCourtBookingFields, publicCourtBookingInputSchema, publicCourtBookingOutcomeSchema } : {},
  });
  const fields = { arenaSlug: ["own"], occurrenceId: ["own-booking"], method: ["PIX"] };
  assert.deepEqual(await exports.remotePublicCourtBookingMutation("https://backend.invalid", "payment", fields), payload);
  status = 401; assert.equal((await exports.remotePublicCourtBookingMutation("https://backend.invalid", "payment", fields)).error, "Sem acesso.");
  failure = true; await assert.rejects(exports.remotePublicCourtBookingMutation("https://backend.invalid", "payment", fields), /uncertain write/);
  assert.equal(calls, 3);
  const form = new FormData(); form.set("arenaSlug", "own"); form.set("playerId", "forged");
  assert.deepEqual(exports.publicCourtBookingFormFields("create", form), { arenaSlug: ["own"] });
});
test("public booking response refuses private data and unsafe checkout protocols", () => {
  assert.equal(publicCourtBookingOutcomeSchema.safeParse({ error: null, result: { checkoutUrl: "https://payment.invalid/checkout" } }).success, true);
  for (const checkoutUrl of ["javascript:alert(1)", "//foreign.invalid", "https://user:secret@foreign.invalid", "/\\foreign.invalid"]) assert.equal(publicCourtBookingOutcomeSchema.safeParse({ error: null, result: { checkoutUrl } }).success, false);
  assert.equal(publicCourtBookingOutcomeSchema.safeParse({ error: null, result: { checkoutUrl: "https://payment.invalid", accessToken: "private" } }).success, false);
});
test("public booking endpoint preserves actionable profile errors and hides provider failures", async () => {
  const { readFileSync } = await import("node:fs");
  const { default: ts } = await import("typescript");
  const { default: vm } = await import("node:vm");
  const exports: Record<string, (...args: any[]) => Promise<Response>> = {};
  let message = "Para emitir boleto, complete no perfil: CPF com 11 dígitos, CEP, rua.";
  const { allowedFrontendOrigin } = await import("../src/lib/backend/origin-policy");
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/api/portal/bookings/actions/[operation]/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Error, process: { env: { VX4_FRONTEND_ORIGINS: '["https://frontend.invalid"]' } },
    require: (name: string) => name === "next/server" ? { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } } : name.includes("services/player-session") ? { getPublicPlayerAuth: async () => ({ playerId: "own", arenaId: "own" }) } : name.includes("origin-policy") ? { allowedFrontendOrigin } : name.includes("http/json-body") ? { readBoundedJson: (request: Request) => request.json(), RequestBodyTooLargeError: class extends Error {} } : name.includes("contracts/public-court-booking") ? { publicCourtBookingFields, publicCourtBookingInputSchema } : name.includes("services/public-court-booking-mutations") ? { executePublicCourtBookingMutation: async () => { throw Error(message); } } : {},
  });
  const request = () => new Request("https://backend.invalid/api/portal/bookings/actions/payment", { method: "POST", headers: { origin: "https://frontend.invalid", "content-type": "application/json" }, body: JSON.stringify({ fields: { arenaSlug: ["own"], occurrenceId: ["own"], method: ["BOLETO"] } }) });
  const context = { params: Promise.resolve({ operation: "payment" }) };
  const incomplete = await exports.POST(request(), context); assert.equal(incomplete.status, 400); assert.equal((await incomplete.json()).error, message);
  message = "Para emitir boleto, complete no perfil: accessToken=private.";
  const privateFailure = await exports.POST(request(), context); assert.equal(privateFailure.status, 500); assert.equal((await privateFailure.text()).includes("private"), false);
});
