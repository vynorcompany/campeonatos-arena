import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as jsonBody from "../src/lib/http/json-body";

const require = createRequire(import.meta.url);
function load(path: string) {
  let databaseCalls = 0;
  const exports: any = {};
  const unexpectedDatabase = new Proxy({}, { get() { databaseCalls++; throw Error("must reject before database access"); } });
  vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Response, URL, Date, Buffer, console,
    require(name: string) {
      if (name === "@/lib/http/json-body") return jsonBody;
      if (name === "next/server") return { NextResponse: Response };
      if (name === "zod") return require(name);
      if (name === "@/lib/agents/authenticate") return { authenticateAgent: async () => ({ id: "key", arenaId: "arena" }) };
      if (name === "@/lib/prisma") return { prisma: unexpectedDatabase };
      return {};
    },
  });
  return { post: exports.POST, calls: () => databaseCalls };
}

test("payment and WhatsApp webhooks reject oversized anonymous input before looking up a tenant", async () => {
  for (const [path, limit] of [
    ["src/app/api/payments/mercado-pago/webhook/route.ts", 64 * 1024],
    ["src/app/api/payments/mercado-pago/agency/webhook/route.ts", 64 * 1024],
    ["src/app/api/integrations/evolution/webhook/route.ts", 32 * 1024 * 1024],
  ] as const) {
    const route = load(path);
    const response = await route.post(new Request("https://example.test/webhook", { method: "POST", body: JSON.stringify({ payload: "x".repeat(limit) }) }));
    assert.equal(response.status, 413, path);
    assert.equal(route.calls(), 0);
  }
});

test("authenticated agent writes enforce their smaller JSON limit before the transaction", async () => {
  const route = load("src/app/api/agents/[resource]/route.ts");
  const response = await route.post(new Request("https://example.test/api/agents/finance", { method: "POST", headers: { "idempotency-key": "fixture-key" }, body: JSON.stringify({ description: "x".repeat(64 * 1024) }) }), { params: Promise.resolve({ resource: "finance" }) });
  assert.equal(response.status, 413);
  assert.equal(route.calls(), 0);
});
