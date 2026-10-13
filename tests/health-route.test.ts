import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/api/health/route.ts", import.meta.url), "utf8");

function healthRoute(databaseAvailable: boolean) {
  const exports: Record<string, unknown> = {};
  let logged = 0;
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    Date,
    console: { error: () => { logged += 1; } },
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (body: unknown, options: { status: number }) => ({ body, status: options.status }) } };
      if (name === "@/lib/prisma") return { prisma: { $queryRaw: async () => {
        if (!databaseAvailable) throw new Error("connection string must not leak to the response");
        return [{ result: 1 }];
      } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { GET: exports.GET as () => Promise<{ body: { ok: boolean; service: string }; status: number }>, dynamic: exports.dynamic, get logged() { return logged; } };
}

test("health sinaliza aplicação e banco disponíveis", async () => {
  const route = healthRoute(true);
  const response = await route.GET();
  assert.equal(route.dynamic, "force-dynamic");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "campeonatos-padel");
  assert.equal(route.logged, 0);
});

test("health devolve 503 sem expor detalhes quando o banco falha", async () => {
  const route = healthRoute(false);
  const response = await route.GET();
  assert.equal(response.status, 503);
  assert.equal(response.body.ok, false);
  assert.doesNotMatch(JSON.stringify(response.body), /connection string/);
  assert.equal(route.logged, 1);
});
