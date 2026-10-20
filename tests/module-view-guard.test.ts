import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canViewModule } from "../src/lib/permissions";

test("acesso de leitura a outro módulo retorna 404, sem erro de servidor", async () => {
  const auth = { arenaRole: "STAFF", systemRole: "VIEWER", viewPermissions: ["matches"] };
  const denied = new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  const exports: { requireModuleView?: (module: "matches" | "tournaments") => Promise<unknown> } = {};
  const source = readFileSync(new URL("../src/lib/auth/guards.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/auth/session") return { requireArenaAccess: async () => auth };
      if (name === "next/navigation") return { notFound: () => { throw denied; } };
      if (name === "@/lib/permissions") return { canViewModule };
      return {};
    },
  });
  assert.equal(await exports.requireModuleView?.("matches"), auth);
  await assert.rejects(exports.requireModuleView!("tournaments"), (error) => error === denied);
});
