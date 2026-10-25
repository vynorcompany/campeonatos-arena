import assert from "node:assert/strict";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("expiry job requires an authenticated scheduler before accessing any arena", async () => {
  const secret = randomUUID();
  let calls = 0, failed = 0;
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/api/jobs/portal-checkout-expiry/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Buffer,
    require: (name: string) => {
      if (name === "node:crypto") return { timingSafeEqual };
      if (name === "next/server") return { NextResponse: { json: (body: unknown, options: { status: number }) => ({ body, status: options.status }) } };
      if (name === "@/lib/env") return { env: { cronSecret: secret } };
      if (name === "@/lib/payments/portal-checkout-expiry") return { expirePortalCheckouts: async () => { calls++; return { expired: 1, review: 0, failed }; } };
      throw new Error(name);
    },
  });
  const invalidHeaders: Record<string, string>[] = [{}, { authorization: "Bearer incorrect" }, { "x-cron-secret": randomUUID() }];
  for (const headers of invalidHeaders) {
    assert.equal((await exports.POST(new Request("https://arena.example.test/api/jobs/portal-checkout-expiry", { headers }))).status, 401);
  }
  assert.equal(calls, 0);
  const validHeaders: Record<string, string>[] = [{ authorization: `Bearer ${secret}` }, { "x-cron-secret": secret }];
  for (const headers of validHeaders) {
    const response = await exports.POST(new Request("https://arena.example.test/api/jobs/portal-checkout-expiry", { headers }));
    assert.equal(response.status, 200); assert.equal(response.body.expired, 1);
  }
  failed = 1;
  assert.equal((await exports.POST(new Request("https://arena.example.test/api/jobs/portal-checkout-expiry", { headers: { "x-cron-secret": secret } }))).status, 500);
});
