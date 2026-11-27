import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as contracts from "../src/lib/backend/contracts/agency-billing";
function fixture(outcome: unknown, fail = false) {
  const requests: Array<{ url: string; init: RequestInit }> = [], cache: string[] = [], exports: Record<string, Function> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/agency/billing-mutation.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, FormData, Error, AbortSignal, process: { env: { VX4_BACKEND_ORIGIN: "http://backend.test" } },
    fetch: async (url: URL, init: RequestInit) => { requests.push({ url: String(url), init }); if (fail) throw Error("private provider credential"); return Response.json(outcome); },
    require(name: string) {
      if (name === "server-only") return {};
      if (name === "next/headers") return { headers: async () => new Headers({ origin: "https://frontend.test" }) };
      if (name === "next/cache") return { revalidatePath: (path: string) => cache.push(path) };
      if (name.endsWith("management-context-client")) return { managementCookieHeader: async () => "padel_session=synthetic; padel_arena=arena" };
      if (name.endsWith("http-client")) return { backendOrigin: (origin: string) => new URL(origin) };
      if (name.endsWith("agency-billing")) return contracts;
      throw Error("Unexpected " + name);
    },
  });
  return { run: exports.runAgencyBillingMutation, requests, cache };
}
function form(values: Record<string, string>) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
test("agency billing transport keeps original cache points and sends only scoped management cookies and declared fields", async () => {
  for (const changed of [true, false]) {
    const f = fixture({ error: null, changed }); await f.run("assign", form({ arenaId: "a", planId: "p", systemRole: "SUPER_ADMIN" }));
    assert.equal(f.requests.length, 1); const { init, url } = f.requests[0]; assert.ok(url.endsWith("/api/management/agency/billing/assign"));
    assert.deepEqual(JSON.parse(String(init.body)), { arenaId: "a", planId: "p" });
    const headers = new Headers(init.headers); assert.equal(headers.get("cookie"), "padel_session=synthetic; padel_arena=arena"); assert.equal(headers.get("origin"), "https://frontend.test"); assert.equal(headers.get("authorization"), null); assert.equal(init.redirect, "error"); assert.equal(init.cache, "no-store");
    assert.deepEqual(f.cache, changed ? ["/agencia/planos", "/agencia/financeiro", "/agencia"] : []);
  }
  const grace = fixture({ error: null, changed: true }); await grace.run("grace", form({ enabled: "on", graceDays: "7" })); assert.deepEqual(grace.cache, ["/agencia/planos"]);
  const checkout = fixture({ error: "Conecte o Mercado Pago da agência ou verifique se esta fatura já foi paga.", changed: false }); assert.ok((await checkout.run("checkout", form({ invoiceId: "i" }))).error); assert.equal(checkout.cache.length, 0);
});
test("agency billing writes never retry uncertain outcomes or expose unvalidated private data", async () => {
  for (const f of [fixture(null, true), fixture({ error: null, changed: true, encryptedSecrets: "private" })]) { assert.equal((await f.run("assign", form({ arenaId: "a", planId: "p" }))).error, "Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente."); assert.equal(f.requests.length, 1); assert.equal(f.cache.length, 0); }
  const duplicate = form({ arenaId: "a", planId: "p" }); duplicate.append("planId", "other"); const f = fixture({ error: null, changed: true }); assert.ok((await f.run("assign", duplicate)).error); assert.equal(f.requests.length, 0);
});

test("controlled billing failures reach all form bindings as public state rather than redacted exceptions", async () => {
  const f = fixture({ error: "Este plano não pode ser alterado.", changed: false }); assert.equal((await f.run("plan", form({ id: "p", name: "Plano", monthlyPrice: "100,00" }))).error, "Este plano não pode ser alterado."); assert.equal(f.cache.length, 0);
  const exports: Record<string, Function> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/agency-subscriptions.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require(name: string) { assert.equal(name, "@/lib/agency/billing-mutation"); return { runAgencyBillingMutation: async () => ({ error: "Somente administradores da agência podem alterar planos e assinaturas." }) }; } });
  for (const name of ["saveAgencyPlanAction", "assignAgencyPlanAction", "setAgencySubscriptionStatusAction", "prepareAgencyInvoiceAction", "saveAgencyBillingGraceAction"]) assert.equal((await exports[name](new FormData())).error, "Somente administradores da agência podem alterar planos e assinaturas.");
});
