import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { canPerformPermission } from "../src/lib/permissions";

function readActionFile(name: string) {
  return readFileSync(new URL(`../src/lib/actions/${name}.ts`, import.meta.url), "utf8");
}

function tournamentGuards(source: string) {
  const syntax = ts.createSourceFile("actions.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const guards: Record<string, string> = {};
  for (const declaration of syntax.statements) {
    if (!ts.isFunctionDeclaration(declaration) || !declaration.name || !declaration.body) continue;
    const used: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
          ["requirePermission", "requireModuleEdit"].includes(node.expression.text) &&
          node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        if (key.startsWith("tournaments") || key === "tournaments") used.push(`${node.expression.text}:${key}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(declaration.body);
    if (used.length) {
      assert.equal(used.length, 1, `${declaration.name.text} precisa ter uma única guarda de torneio`);
      guards[declaration.name.text] = used[0];
    }
  }
  return guards;
}

test("cada ação de torneio usa a permissão exata, sem guarda genérica", () => {
  const manage = [
    "updateTournamentEntryPointsAction", "createTournamentAction", "createTournamentCategoryAction",
    "finishTournamentAction", "reopenTournamentAction", "updateTournamentAction",
    "deleteTournamentAction", "syncEntriesAction", "updateTournamentRegistrationPhaseAction",
    "generateCategoryBracketAction", "updateTournamentCategoryFormatAction", "updateTournamentStatusAction",
    "createManualTournamentRegistrationAction", "deleteTournamentRegistrationAction", "updateTournamentRegistrationAction",
  ];
  const rankings = [
    "createRankingProfileAction", "updateRankingProfileAction", "updateRankingPointsAction",
    "updateRankingConfigurationAction", "resetRankingPointsAction", "createRankingCycleAction", "deleteRankingProfileAction",
  ];
  const expected = Object.fromEntries([
    ...manage.map((name) => [name, "requirePermission:tournaments:manage"]),
    ...rankings.map((name) => [name, "requirePermission:tournaments:rankings"]),
  ]);
  assert.deepEqual(tournamentGuards(readActionFile("tournament")), expected);
});

test("cada ação da competição usa a permissão específica", () => {
  const manage = [
    "createCategoryCompetitionAction", "addManualPairAction", "removeCategoryPairAction",
    "generateCategoryDrawAction", "moveCategoryPairAction", "updateTournamentCategorySettingsAction",
    "replaceCategoryPairPlayerAction", "reopenCategoryLeagueForEditingAction", "updateCategoryMatchScheduleAction",
    "finishCategoryCompetitionAction", "updateLeaguePrizeAction", "updateLeagueCategoryAction",
    "runLeagueLifecycleAction", "reopenLeagueCycleAction",
  ];
  const publish = ["publishCategoryDrawAction", "updateCategoryPublicVisibilityAction"];
  const results = [
    "recordCategoryMatchResultAction", "recordCategoryLeagueMatchResultAction",
    "resetCategoryLeagueMatchResultAction", "updateCategoryMatchStatusAction",
  ];
  assert.deepEqual(tournamentGuards(readActionFile("category-competition")), Object.fromEntries([
    ...manage.map((name) => [name, "requirePermission:tournaments:manage"]),
    ...publish.map((name) => [name, "requirePermission:tournaments:publish"]),
    ...results.map((name) => [name, "requirePermission:tournaments:results"]),
  ]));
});

test("gestão, publicação, resultado e ranking não concedem acesso entre si", () => {
  const keys = ["manage", "publish", "results", "rankings"];
  for (const granted of keys) for (const requested of keys) {
    assert.equal(canPerformPermission(`tournaments:${requested}`, "STAFF", "VIEWER", [`tournaments:${granted}`]),
      requested === granted, `${granted} não deve autorizar ${requested}`);
  }
  assert.equal(canPerformPermission("tournaments:manage", "STAFF", "VIEWER", ["tournaments"]), true);
});

test("ações rejeitam o perfil sem permissão antes de consultar o banco", async () => {
  for (const [name, actions] of [
    ["tournament", ["createTournamentAction", "createRankingProfileAction", "generateCategoryBracketAction"]],
    ["category-competition", ["createCategoryCompetitionAction", "publishCategoryDrawAction", "recordCategoryMatchResultAction", "runLeagueLifecycleAction"]],
  ] as const) {
    const checked: string[] = [];
    const exported: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
    vm.runInNewContext(ts.transpileModule(readActionFile(name), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText, {
      exports: exported,
      FormData,
      require: (moduleName: string) => moduleName === "@/lib/auth/guards"
        ? { requirePermission: async (key: string) => { checked.push(key); throw new Error("SEM_PERMISSAO"); } }
        : moduleName === "@/lib/prisma"
          ? { prisma: new Proxy({}, { get: () => { throw new Error("ACESSO_AO_BANCO"); } }) }
          : {},
    });
    for (const action of actions) {
      await assert.rejects(exported[action](new FormData(), new FormData()), /SEM_PERMISSAO/);
    }
    assert.equal(checked.length, actions.length);
  }
});

test("substituição médica exige gestão da Liga", () => {
  const guards = tournamentGuards(readActionFile("league-medical-substitutions"));
  assert.deepEqual(guards, { reviewLeagueMedicalSubstitutionAction: "requirePermission:tournaments:manage" });
});
