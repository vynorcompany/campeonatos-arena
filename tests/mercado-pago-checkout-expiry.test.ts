import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const now = new Date("2030-01-01T12:00:00Z");
const input = { arenaId: "arena-a", checkoutId: "checkout-a", preferenceId: "preference-a", expiresAt: new Date(now.getTime() - 60_000) };
type Payment = { id: string; status: string; external_reference: string };
function provider(statuses: string[] = [], mutate?: (path: string, method: string, payload: any) => any) {
  const payments: Payment[] = statuses.map((status, i) => ({ id: String(i + 1), status, external_reference: input.checkoutId }));
  const calls: Array<{ path: string; method: string }> = [];
  let tokenReads = 0;
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/payments/mercado-pago-checkout-expiry.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, Set, URLSearchParams, AbortSignal,
    require: (name: string) => {
      assert.equal(name, "@/lib/payments/mercado-pago");
      return { mercadoPagoAccessTokenForArena: async (arenaId: string) => { assert.equal(arenaId, input.arenaId); tokenReads++; return "own-arena-token"; } };
    },
    fetch: async (url: string, options: any) => {
      const parsed = new URL(url);
      assert.equal(parsed.origin, "https://api.mercadopago.com");
      assert.equal(options.headers.Authorization, "Bearer own-arena-token");
      assert.ok(options.signal instanceof AbortSignal);
      const path = parsed.pathname, method = options.method;
      calls.push({ path, method });
      let payload: any;
      if (path.startsWith("/checkout/preferences/")) payload = { id: input.preferenceId, external_reference: input.checkoutId, expires: true, expiration_date_to: input.expiresAt.toISOString() };
      else if (path === "/v1/payments/search") {
        assert.equal(parsed.searchParams.get("external_reference"), input.checkoutId);
        const offset = Number(parsed.searchParams.get("offset"));
        payload = { paging: { total: payments.length }, results: payments.slice(offset, offset + 50).map(p => ({ ...p })) };
      } else {
        const payment = payments.find(p => p.id === path.split("/").pop());
        assert.ok(payment);
        if (method === "PUT") { assert.deepEqual(JSON.parse(options.body), { status: "cancelled" }); payment.status = "cancelled"; }
        payload = { ...payment };
      }
      return { ok: true, json: async () => mutate ? mutate(path, method, payload) : payload };
    },
  });
  return { run: (value = input, options?: { allowFullyRefunded?: boolean }) => exports.expireMercadoPagoCheckout(value, now, options), payments, calls, get tokenReads() { return tokenReads; } };
}

test("expired preference with no payment attempts can be released", async () => {
  const flow = provider();
  assert.equal((await flow.run()).kind, "expired");
  assert.equal(flow.calls.filter(c => c.method === "PUT").length, 0);
});

test("expiry cancels every pending, processing and authorized attempt, then confirms each by GET", async () => {
  const flow = provider(["pending", "in_process", "authorized", "cancelled", "rejected"]);
  const result = await flow.run();
  assert.equal(result.kind, "expired");
  assert.equal(result.paymentIds.length, 5);
  assert.equal(flow.calls.filter(c => c.method === "PUT").length, 3);
  assert.equal(flow.calls.filter(c => /^\/v1\/payments\/\d+$/.test(c.path) && c.method === "GET").length, 8);
  assert.ok(flow.payments.every(p => ["cancelled", "rejected"].includes(p.status)));
});

test("all result pages are checked rather than releasing after the first fifty attempts", async () => {
  const flow = provider([...Array(50).fill("cancelled"), "approved"]);
  const result = await flow.run();
  assert.equal(flow.calls.filter(c => c.path === "/v1/payments/search").length, 2);
  assert.equal(result.kind, "review");
  assert.equal(result.reviewPaymentIds[0], "51");
});

test("approved, refunded and disputed payments stay under review and are never cancelled", async () => {
  const flow = provider(["approved", "refunded", "charged_back", "pending"]);
  const result = await flow.run();
  assert.equal(result.kind, "review");
  assert.equal(result.reviewPaymentIds.length, 3);
  assert.deepEqual(flow.payments.slice(0, 3).map(p => p.status), ["approved", "refunded", "charged_back"]);
  assert.equal(flow.payments[3].status, "cancelled");
});

test("only explicit staff reconciliation allows fully refunded attempts; another approval still blocks", async () => {
  assert.equal((await provider(["refunded", "cancelled"]).run(input, { allowFullyRefunded: true })).kind, "expired");
  assert.equal((await provider(["refunded", "approved"]).run(input, { allowFullyRefunded: true })).kind, "review");
  assert.equal((await provider(["partially_refunded"]).run(input, { allowFullyRefunded: true }).catch(() => ({ kind: "blocked" }))).kind, "blocked");
});

test("missing preference and future expiry fail before reading credentials or calling the provider", async () => {
  const flow = provider();
  await assert.rejects(flow.run({ ...input, preferenceId: "" }));
  await assert.rejects(flow.run({ ...input, expiresAt: new Date(now.getTime() + 1) }));
  assert.equal(flow.tokenReads, 0);
  assert.equal(flow.calls.length, 0);
});

test("another reference, invalid deadline or active preference cannot release a debt", async () => {
  for (const patch of [{ external_reference: "checkout-b" }, { expires: false }, { expiration_date_to: "invalid" }, { expiration_date_to: new Date(now.getTime() + 1).toISOString() }]) {
    const flow = provider([], (path, _method, payload) => path.startsWith("/checkout/") ? { ...payload, ...patch } : payload);
    await assert.rejects(flow.run());
    assert.equal(flow.calls.length, 1);
  }
});

test("truncated, excessive or inconsistent provider lists stay blocked", async () => {
  for (const patch of [{ paging: { total: 201 } }, { paging: { total: 2 } }, { paging: { total: "1" } }, { results: [{ id: "1", external_reference: "checkout-b" }] }]) {
    const flow = provider(["pending"], (path, _method, payload) => path.endsWith("/search") ? { ...payload, ...patch } : payload);
    await assert.rejects(flow.run());
    assert.equal(flow.calls.filter(c => c.method === "PUT").length, 0);
  }
});

test("a successful cancellation response is insufficient if the following GET remains pending", async () => {
  const flow = provider(["pending"], (path, method, payload) => path === "/v1/payments/1" && method === "GET" ? { ...payload, status: "pending" } : payload);
  await assert.rejects(flow.run(), /não confirmou o cancelamento/);
});

test("lost cancellation response reconciles safely, while a concurrent approval requires review", async () => {
  const accepted = provider(["pending"], (_path, method, payload) => { if (method === "PUT") throw new Error("lost response"); return payload; });
  assert.equal((await accepted.run()).kind, "expired");
  let afterPut = false;
  const raced = provider(["pending"], (path, method, payload) => { if (method === "PUT") afterPut = true; return afterPut && path === "/v1/payments/1" ? { ...payload, status: "approved" } : payload; });
  assert.equal((await raced.run()).kind, "review");
});
