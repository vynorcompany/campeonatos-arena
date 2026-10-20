import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canManageTournamentMatches, canPerformPermission, canRecordTournamentMatchResult, canViewModule } from "../src/lib/permissions";

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

test("lançar resultados não autoriza alterar agenda ou participantes", () => {
  assert.equal(canRecordTournamentMatchResult("STAFF", "VIEWER", ["tournaments:view"], ["tournaments:results"]), true);
  assert.equal(canManageTournamentMatches("STAFF", "VIEWER", ["tournaments:view"], ["tournaments:results"]), false);
  assert.equal(canRecordTournamentMatchResult("STAFF", "VIEWER", ["matches"], ["tournaments:results"]), false);
  assert.equal(canRecordTournamentMatchResult("STAFF", "VIEWER", ["matches"], ["matches"]), false);
  assert.equal(canRecordTournamentMatchResult("STAFF", "VIEWER", ["tournaments:view"], ["matches"]), true);
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
      requireTournamentResultEdit: async () => { checked.push("result"); throw new Error("Sem permissão para lançar resultados de torneios."); },
      requireModuleEdit: async () => { throw new Error("Guarda de módulo isolada indevida."); },
    } : {},
  });
  const actions = [
    "generateMatchesAction", "updateMatchCourtAction", "updateMatchScheduleAction",
    "updateMatchParticipantsAction", "updateMatchManualStatusAction", "updateMatchTvVisibilityAction",
    "updateCategoryBracketMatchScheduleAction",
  ];
  for (const action of actions) {
    await assert.rejects(exports[action](new FormData()), /Sem permissão para gerenciar jogos de torneios/);
  }
  await assert.rejects(exports.updateMatchResultAction(new FormData()), /Sem permissão para lançar resultados de torneios/);
  assert.deepEqual(checked, [...actions.map(() => "guard"), "result"]);
});
