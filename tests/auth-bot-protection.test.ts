import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);
test("bulk form fillers cannot reach credential checks, account writes or WhatsApp delivery", async () => {
  const routes: [string, string[]][] = [
    ["../src/lib/actions/player-auth.ts", ["registerPublicClientAction", "confirmPublicClientRegistrationAction", "loginPublicClientAction", "loginGlobalAthleteAction", "requestGlobalPublicPasswordResetAction", "confirmGlobalPublicPasswordResetAction", "requestPublicPasswordResetAction", "confirmPublicPasswordResetAction"]],
    ["../src/lib/auth/actions.ts", ["loginAction"]],
  ];
  for (const [path, names] of routes) {
    const exports: Record<string, (state: unknown, form: FormData) => Promise<{ error: string | null }>> = {};
    const unavailable = new Proxy({}, { get() { throw new Error("Blocked form reached an external dependency"); } });
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, FormData, require: (name: string) => name.startsWith("@/") || name.startsWith("next/") ? unavailable : nodeRequire(name) });
    for (const name of names) {
      const form = new FormData(); form.set("contactWebsite", "https://automated.invalid");
      assert.match((await exports[name]({ error: null }, form)).error ?? "", /validar o formulário/, name);
    }
  }
});
