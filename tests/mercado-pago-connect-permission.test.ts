import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canPerformPermission } from "../src/lib/permissions";

test("conectar Mercado Pago exige gestão financeira, não só criação de lançamentos", async () => {
  assert.equal(canPerformPermission("finance:settings:manage", "STAFF", "VIEWER", ["finance:receivable:create"]), false);
  assert.equal(canPerformPermission("finance:settings:manage", "STAFF", "VIEWER", ["finance:settings:manage"]), true);
  const source = readFileSync(new URL("../src/app/api/integrations/payments/mercado-pago/connect/route.ts", import.meta.url), "utf8");
  const exports: Record<string, (request: Request) => Promise<{ url: string }>> = {};
  const checked: string[] = [];
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports,
    URL,
    Error,
    require: (name: string) => name === "next/server" ? { NextResponse: { redirect: (url: URL) => ({ url: url.toString() }) } }
      : name === "@/lib/auth/guards" ? { requirePermission: async (key: string) => { checked.push(key); throw new Error("Sem permissão"); } }
      : name === "@/lib/payments/mercado-pago-oauth" ? { mercadoPagoAuthorizationUrl: () => { throw new Error("OAuth não deve iniciar"); } } : {},
  });
  const response = await exports.GET(new Request("https://arena.example/api/integrations/payments/mercado-pago/connect"));
  assert.deepEqual(checked, ["finance:settings:manage"]);
  assert.match(response.url, /connectionError=Sem\+permiss%C3%A3o/);
});
