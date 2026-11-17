import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CategoryCompetitionConfigurationError } from "../src/lib/tournament-category/configuration-error";

const source = readFileSync(new URL("../src/lib/actions/category-competition.ts", import.meta.url), "utf8");
const body = source.slice(source.indexOf("export async function createCategoryCompetitionAction"), source.indexOf("export async function addManualPairAction"));
function action(service: () => Promise<unknown>, allowed = true) {
  const context = vm.createContext({
    CategoryCompetitionConfigurationError,
    requirePermission: async () => { if (!allowed) throw new Error("Forbidden"); return { arenaId: "arena-1" }; },
    createCategoryCompetitionSchema: { safeParse: () => ({ success: true, data: {} }) },
    createCategoryCompetition: service,
    refreshCategoryCompetitionRoutes: () => {},
  });
  vm.runInContext(ts.transpile(body.replace("export async", "async"), { target: ts.ScriptTarget.ES2022 }) + ";globalThis.action = createCategoryCompetitionAction;", context);
  return context.action as (data: FormData) => Promise<{ error?: string }>;
}
test("known configuration errors remain readable in production server action responses", async () => {
  const message = "Esta categoria já possui chaveamento. Crie uma nova categoria para o Trio para preservar os jogos existentes.";
  const result = await action(async () => { throw new CategoryCompetitionConfigurationError(message); })(new FormData());
  assert.equal(result.error, message);
});
test("unexpected storage errors are not returned as public messages", async () => {
  const internal = new Error("private SQL detail");
  await assert.rejects(action(async () => { throw internal; })(new FormData()), (error) => error === internal);
});
test("permission rejection happens before configuration service", async () => {
  let called = false;
  await assert.rejects(action(async () => { called = true; }, false)(new FormData()), /Forbidden/);
  assert.equal(called, false);
});
