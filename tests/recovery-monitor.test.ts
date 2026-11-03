import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { readBoundedJson } from "../src/lib/http/json-body";

function fixture() {
  const records = new Map<string, any>();
  const failures: unknown[][] = [];
  // No tenant models are exposed: an infrastructure report must never touch them.
  const tx = {
    $executeRaw: async () => {},
    recoveryCheck: {
      findUnique: async ({ where }: any) => records.get(where.id),
      upsert: async ({ where, create, update }: any) => {
        records.set(where.id, records.has(where.id) ? { ...records.get(where.id), ...update } : create);
      },
    },
  };
  const mocks: Record<string, unknown> = {
    "node:crypto": { timingSafeEqual }, zod: { z },
    "next/server": { NextResponse: { json: (body: any, options: any) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/prisma": { prisma: { $transaction: async (run: any) => run(tx) } },
    "@/lib/http/json-body": { readBoundedJson },
  };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/app/api/jobs/recovery-monitor/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: (name: string) => mocks[name], process: { env: { RECOVERY_MONITOR_SECRET: "s".repeat(64) } }, Buffer, Date, console: { error: (...args: unknown[]) => failures.push(args) } });
  return {
    post: (body: unknown, token = "s".repeat(64)) => exports.POST(new Request("http://local/api/jobs/recovery-monitor", {
      method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body),
    })), records, failures,
  };
}

test("recovery reports require a dedicated credential and validated body", async () => {
  const f = fixture();
  assert.equal((await f.post({ kind: "wal-archive", ok: false }, "wrong")).status, 401);
  assert.equal((await f.post({ kind: "wal-archive", ok: false }, "é".repeat(64))).status, 401);
  assert.equal((await f.post({ kind: "unknown", ok: false })).status, 400);
  assert.equal(f.records.size, 0);
  assert.equal(f.failures.length, 0);
});

test("technical failures stay in the recovery monitor and logs, never tenant notifications", async () => {
  const f = fixture();
  for (const kind of ["independent-copy", "wal-archive", "pitr-drill"]) {
    const before = f.failures.length;
    assert.equal((await f.post({ kind, ok: false })).status, 200);
    assert.equal(f.records.get(kind).status, "FAILED");
    assert.equal(f.failures.length, before + 1);
    await f.post({ kind, ok: false });
    assert.equal(f.failures.length, before + 1);
    await f.post({ kind, ok: true });
    assert.equal(f.records.get(kind).status, "OK");
    const lastSuccess = f.records.get(kind).lastSuccessAt;
    assert.ok(lastSuccess);
    await f.post({ kind, ok: false });
    assert.equal(f.records.get(kind).lastSuccessAt, lastSuccess);
    assert.equal(f.failures.length, before + 2);
  }
});

test("initial tenant notification rendering excludes historical recovery alerts", () => {
  const source = readFileSync("src/app/(app)/layout.tsx", "utf8");
  assert.match(source, /type: \{ notIn: \["SYSTEM_RECOVERY",/);
});
