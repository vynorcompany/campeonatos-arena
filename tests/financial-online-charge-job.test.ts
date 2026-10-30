import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/api/jobs/financial-online-charges/route.ts", import.meta.url), "utf8");

type JobResult = { status: number; body: Record<string, unknown> };

function loadJob(arena: () => Promise<Record<string, number>>, agency: () => Promise<Record<string, number>>, prices = async () => ({ applied: 0, failed: 0 })) {
  const exports: Record<string, (request: Request) => Promise<JobResult>> = {};
  const errors: unknown[][] = [];
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    console: { error: (...args: unknown[]) => errors.push(args) },
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (body: Record<string, unknown>, init: { status?: number } = {}) => ({ body, status: init.status ?? 200 }) } };
      if (name === "@/lib/env") return { env: { cronSecret: "synthetic-cron-secret-for-tests" } };
      if (name === "@/lib/payments/recurring-online-charges") return { issueRecurringOnlineCharges: arena };
      if (name === "@/lib/academy/plan-price-worker") return { processPlanPriceChanges: prices };
      if (name === "@/lib/services/agency-billing") return { issueDueAgencyInvoices: agency };
      return require(name);
    },
  });
  return { post: exports.POST, errors };
}

function request(secret = "synthetic-cron-secret-for-tests") {
  return new Request("https://arena.example.test/api/jobs/financial-online-charges", {
    method: "POST", headers: { authorization: `Bearer ${secret}` },
  });
}

test("financial job rejects unauthorized requests before running either batch", async () => {
  let called = 0;
  const job = loadJob(async () => { called++; return {}; }, async () => { called++; return {}; }, async () => { called++; return { applied: 0, failed: 0 }; });
  const result = await job.post(request("wrong-secret"));
  assert.equal(result.status, 401);
  assert.equal(called, 0);
});

test("financial job reports partial failures but preserves successful batch results", async () => {
  const job = loadJob(
    async () => ({ scanned: 2, created: 1, skipped: 0, failed: 1 }),
    async () => ({ agencyInvoicesIssued: 1, agencyCheckoutRetries: 0, agencyInvoiceFailures: 0, agencyCheckoutFailures: 0 }),
  );
  const result = await job.post(request());
  assert.equal(result.status, 500);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.created, 1);
  assert.equal(result.body.agencyInvoicesIssued, 1);
});

test("agency batch runs even when arena batch rejects", async () => {
  let agencyRan = false;
  const job = loadJob(
    async () => { throw new Error("synthetic arena failure"); },
    async () => { agencyRan = true; return { agencyInvoicesIssued: 1, agencyCheckoutRetries: 0, agencyInvoiceFailures: 0, agencyCheckoutFailures: 0 }; },
  );
  const result = await job.post(request());
  assert.equal(result.status, 500);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.agencyInvoicesIssued, 1);
  assert.equal(agencyRan, true);
  assert.equal(job.errors.length, 1);
});

// A failed price update must not allow invoices at stale plan prices.
test("price processing runs before billing and a failed update prevents issuing charges", async () => {
  const order: string[] = [];
  const job = loadJob(async () => { order.push("arena"); return {}; }, async () => { order.push("agency"); return {}; }, async () => { order.push("prices"); return { applied: 0, failed: 1 }; });
  const result = await job.post(request());
  assert.equal(result.status, 500);
  assert.deepEqual(order, ["prices"]);
  const success = loadJob(async () => { order.push("arena"); return { failed: 0 }; }, async () => { order.push("agency"); return { agencyInvoiceFailures: 0, agencyCheckoutFailures: 0 }; }, async () => { order.push("prices"); return { applied: 1, failed: 0 }; });
  order.length = 0;
  assert.equal((await success.post(request())).status, 200);
  assert.deepEqual(order, ["prices", "arena", "agency"]);
});
