import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canManageTournamentMatches, canPerformPermission, canViewModule } from "../src/lib/permissions";

test("visualizar torneios não autoriza gerenciar categorias", () => {
  assert.equal(canViewModule("tournaments", "STAFF", "VIEWER", ["tournaments:view"]), true);
  assert.equal(canPerformPermission("tournaments:manage", "STAFF", "VIEWER", []), false);
  assert.equal(canPerformPermission("tournaments:manage", "STAFF", "VIEWER", ["tournaments:results"]), false);
  assert.equal(canPerformPermission("tournaments:manage", "STAFF", "VIEWER", ["tournaments:manage"]), true);
});

test("permissão Jogos isolada permite consulta, não edição de torneio", () => {
  assert.equal(canManageTournamentMatches("STAFF", "VIEWER", ["matches"], ["matches"]), false);
  assert.equal(canManageTournamentMatches("STAFF", "VIEWER", ["tournaments"], ["matches"]), true);
  assert.equal(canManageTournamentMatches("STAFF", "VIEWER", ["matches"], ["tournaments"]), false);
  assert.equal(canManageTournamentMatches("OWNER", "VIEWER", [], []), true);
});

test("ações de partidas exigem a guarda de torneio antes de consultar ou alterar dados", async () => {
  const source = readFileSync(new URL("../src/lib/actions/tournament.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  const checked: string[] = [];
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports,
    FormData,
    require: (name: string) => name === "@/lib/auth/guards" ? {
      requireTournamentMatchEdit: async () => { checked.push("guard"); throw new Error("Sem permissão para gerenciar jogos de torneios."); },
      requireModuleEdit: async () => { throw new Error("Guarda de módulo isolada indevida."); },
    } : {},
  });
  const actions = [
    "generateMatchesAction", "updateMatchCourtAction", "updateMatchScheduleAction", "updateMatchResultAction",
    "updateMatchParticipantsAction", "updateMatchManualStatusAction", "updateMatchTvVisibilityAction",
    "updateCategoryBracketMatchScheduleAction",
  ];
  for (const action of actions) {
    await assert.rejects(exports[action](new FormData()), /Sem permissão para gerenciar jogos de torneios/);
  }
  assert.equal(checked.length, actions.length);
});
