import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/agency-pages";
import * as zod from "zod";
const plans = { plans: [], arenas: [], subscriptions: [{ id: "s", arenaId: "a", planId: "p", status: "ACTIVE", trialEndsAt: "2035-01-10T10:00:00.000Z", plan: { id: "p", name: "Plan", monthlyPriceCents: 15000, isTrial: false, isActive: true } }], invoices: [{ id: "invoice", period: "2035-01", amountCents: 15000, dueAt: "2035-01-10T10:00:00.000Z", status: "PENDING", paymentReviewStatus: "", providerPaymentId: "", checkoutUrl: "", arena: { name: "Arena" } }], connection: null };
function fixture(value: unknown, fail = false) {
  const requests: Array<{ path: string; options: RequestInit | undefined }> = [];
  const exports: Record<string, Function> = {};
  const httpExports: Record<string, Function> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/http-client.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: httpExports, URL, AbortSignal,
    require: (name: string) => { if (name === "zod") return zod; throw Error("Unexpected " + name); },
    fetch: async (url: URL, options: RequestInit) => { requests.push({ path: url.pathname, options }); if (fail) throw Error("private provider credential"); return Response.json(value); },
  });
  const source = readFileSync(new URL("../src/lib/agency/pages.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, process: { env: { VX4_BACKEND_ORIGIN: "http://backend.test" } },
    require(name: string) {
      if (name === "server-only") return {};
      if (name.endsWith("management-context-client")) return { managementCookieHeader: async () => "padel_session=synthetic; padel_arena=arena" };
      if (name.endsWith("agency-pages")) return contracts;
      if (name.endsWith("http-client")) return httpExports;
      throw Error("Unexpected " + name);
    },
  });
  return { exports, requests };
}
test("agency page transport forwards only management cookies and decodes declared dates", async () => {
  const f = fixture(plans), result = await f.exports.getAgencyPlansPage();
  assert.equal(result.subscriptions[0].trialEndsAt.toISOString(), plans.subscriptions[0].trialEndsAt);
  assert.equal(result.invoices[0].dueAt.toISOString(), plans.invoices[0].dueAt);
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].path, "/api/management/agency/workspaces/plans");
  const headers = new Headers(f.requests[0].options?.headers); assert.equal(headers.get("cookie"), "padel_session=synthetic; padel_arena=arena"); assert.equal(headers.get("authorization"), null); assert.equal(f.requests[0].options?.redirect, "error"); assert.equal(f.requests[0].options?.cache, "no-store");
  const history = fixture({ tickets: [{ id: "t", title: "Title", code: "A1", status: "CLOSED", arena: { name: "Arena" }, assignee: null, updatedAt: "2035-01-10T10:00:00.000Z" }] }); assert.equal((await history.exports.getAgencyTicketHistory()).tickets[0].updatedAt.toISOString(), "2035-01-10T10:00:00.000Z");
  const connections = fixture({ arenas: [{ id: "a", name: "Arena", whatsappConnection: { status: "CONNECTED", instanceName: "instance", connectedPhone: "5541999990000", lastConnectedAt: "2035-01-10T10:00:00.000Z", lastError: "" } }] }); assert.equal((await connections.exports.getAgencyConnectionsPage()).arenas[0].whatsappConnection.lastConnectedAt.toISOString(), "2035-01-10T10:00:00.000Z");
});
test("agency reads hide infrastructure failures and reject undeclared backend fields without retry", async () => {
  for (const f of [fixture(null, true), fixture({ ...plans, encryptedToken: "private" })]) { await assert.rejects(f.exports.getAgencyPlansPage(), {message:"Não foi possível consultar a agência."}); assert.equal(f.requests.length, 1); }
});
