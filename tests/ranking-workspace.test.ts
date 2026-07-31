import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workspaceRoot = process.cwd();

test("ranking index renders summary rows and an open action", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "tournaments", "ranking-list.tsx"),
    "utf8",
  );

  assert.match(source, /Abrir/);
  assert.doesNotMatch(source, /Salvar ranking/);
});

test("new ranking has a dedicated route", () => {
  assert.ok(
    existsSync(
      path.join(workspaceRoot, "src", "app", "(app)", "torneios", "rankings", "novo", "page.tsx"),
    ),
  );
});

test("create form redirects to the newly created ranking", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-create-form.tsx"),
    "utf8",
  );

  assert.match(source, /router\.push\(`\/torneios\/rankings\/\$\{rankingId\}`\)/);
});

test("ranking workspace exposes four operational tabs", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "tournaments", "ranking-workspace-tabs.tsx"),
    "utf8",
  );

  for (const label of ["Configuração", "Pontuação", "Classificação", "Uso"]) {
    assert.match(source, new RegExp(label));
  }
});

test("configuration owns the name field", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-configuration-form.tsx"),
    "utf8",
  );

  assert.match(source, /name="name"/);
  assert.match(source, /updateRankingConfigurationAction/);
});

test("configuration exposes format and General settings while only locking format", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-configuration-form.tsx"),
    "utf8",
  );

  assert.match(source, /name="type"/);
  assert.match(source, /name="model"/);
  assert.match(source, /name="isGeneral"/);
  assert.match(source, /name="feedsGeneralRanking"/);
  assert.match(source, /disabled=\{formatLocked\}/);
  assert.doesNotMatch(source, /name="isGeneral"[^>]*disabled=\{formatLocked\}/);
  assert.doesNotMatch(source, /name="feedsGeneralRanking"[^>]*disabled=\{formatLocked\}/);
});

test("configuration action returns readable serializable state", () => {
  const actions = readFileSync(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );

  const configurationAction = actions.slice(
    actions.indexOf("export async function updateRankingConfigurationAction"),
    actions.indexOf("export async function resetRankingPointsAction"),
  );
  assert.match(configurationAction, /Promise<RankingActionState>/);
  assert.match(configurationAction, /return \{ error:/);
  assert.doesNotMatch(configurationAction, /throw new Error\(await getRankingUpdateError/);
});

test("points form follows the ranking model", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-points-form.tsx"),
    "utf8",
  );

  assert.match(source, /model === "LEAGUE"/);
  assert.match(source, /updateRankingPointsAction/);
  assert.doesNotMatch(source, /name="name"/);
  assert.doesNotMatch(source, /name="description"/);
  assert.doesNotMatch(source, /name="type"/);
  assert.doesNotMatch(source, /name="model"/);
});

test("points use a dedicated schema and action that update rules only", () => {
  const [actions, validators] = [
    readFileSync(path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"), "utf8"),
    readFileSync(path.join(workspaceRoot, "src", "lib", "validators", "ranking.ts"), "utf8"),
  ];

  assert.match(validators, /export const updateRankingPointsSchema/);
  const pointsAction = actions.slice(
    actions.indexOf("export async function updateRankingPointsAction"),
    actions.indexOf("export async function updateRankingConfigurationAction"),
  );
  assert.match(pointsAction, /syncRankingRules/);
  assert.doesNotMatch(pointsAction, /rankingProfile\.updateMany/);
});

test("cycle selection is visible and preserved across every workspace tab", () => {
  const [page, tabs] = [
    readFileSync(path.join(workspaceRoot, "src", "app", "(app)", "torneios", "rankings", "[rankingId]", "page.tsx"), "utf8"),
    readFileSync(path.join(workspaceRoot, "src", "components", "tournaments", "ranking-workspace-tabs.tsx"), "utf8"),
  ];

  assert.match(page, /name="cycleId"/);
  assert.match(page, /ranking\.selectedCycleId/);
  assert.match(tabs, /cycleId/);
  assert.match(tabs, /searchParams\.set\("cycleId", cycleId\)/);
});

test("successful ranking deletion returns to the ranking index", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "components", "forms", "ranking-configuration-form.tsx"),
    "utf8",
  );

  assert.match(source, /successHref="\/torneios\/rankings"/);
});

test("ranking format changes are rejected after a category competition starts", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );

  assert.match(source, /status:\s*\{\s*not:\s*"DRAFT"\s*\}/);
  assert.match(source, /não pode alterar o tipo ou o modelo/i);
});
