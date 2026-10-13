import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const guardsSource = readFileSync(resolve("src/lib/auth/guards.ts"), "utf8");
const notFoundError = new Error("PAGE_NOT_FOUND");

function loadGuards(systemRole: string) {
  const auth = { systemRole };
  const exports: Record<string, () => Promise<typeof auth>> = {};
  vm.runInNewContext(ts.transpileModule(guardsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/auth/session") return { requireAuth: async () => auth };
      if (name === "next/navigation") return { notFound: () => { throw notFoundError; } };
      if (name === "@/lib/permissions") return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test("agency pages return a controlled not-found response for ordinary users", async () => {
  await assert.rejects(loadGuards("VIEWER").requireAgencyPageAccess(), (error) => error === notFoundError);
  await assert.rejects(loadGuards("VIEWER").requireAgencyAccess(), /Sem permissão para acessar o painel da agência/);
  for (const role of ["MANAGER", "ADMIN", "SUPER_ADMIN"]) {
    assert.equal((await loadGuards(role).requireAgencyPageAccess()).systemRole, role);
  }
});

test("every agency page and layout uses the page-level access guard", () => {
  const root = resolve("src/app/(agency)/agencia");
  for (const entry of readdirSync(root, { recursive: true })) {
    const name = String(entry);
    if (name !== "layout.tsx" && !name.endsWith("page.tsx")) continue;
    const source = readFileSync(resolve(root, name), "utf8");
    if (source.includes("export {")) continue;
    assert.match(source, /requireAgencyPageAccess\(\)/, name);
    assert.doesNotMatch(source, /requireAgencyAccess\(\)/, name);
  }
});
