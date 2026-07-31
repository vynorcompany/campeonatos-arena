import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveRankingPeriod } from "../src/lib/ranking/period";

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

test("ranking configuration executes advisory locks and keeps General controls aligned", () => {
  const [actions, form, styles] = [
    readFileSync(path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"), "utf8"),
    readFileSync(path.join(workspaceRoot, "src", "components", "forms", "ranking-configuration-form.tsx"), "utf8"),
    readFileSync(path.join(workspaceRoot, "src", "app", "globals.css"), "utf8"),
  ];

  const lockRankingProfile = actions.slice(
    actions.indexOf("async function lockRankingProfile"),
    actions.indexOf("async function ensureGeneralRankingAvailable"),
  );
  const ensureGeneralRankingAvailable = actions.slice(
    actions.indexOf("async function ensureGeneralRankingAvailable"),
    actions.indexOf("async function ensureRankingBelongsToArena"),
  );

  assert.match(lockRankingProfile, /\$executeRaw/);
  assert.doesNotMatch(lockRankingProfile, /\$queryRaw/);
  assert.match(ensureGeneralRankingAvailable, /\$executeRaw/);
  assert.doesNotMatch(ensureGeneralRankingAvailable, /\$queryRaw/);
  assert.match(form, /ranking-general-control/);
  assert.match(styles, /\.ranking-general-control\s*\{/);
  assert.match(styles, /\.ranking-general-control input\s*\{[\s\S]*width:\s*18px/);
  assert.match(styles, /\.ranking-general-control-copy\s*\{[\s\S]*gap:\s*4px/);
});

test("ranking format changes are rejected after a category competition starts", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );

  assert.match(source, /status:\s*\{\s*not:\s*"DRAFT"\s*\}/);
  assert.match(source, /não pode alterar o tipo ou o modelo/i);
});

function assertLocalDate(date: Date | null, expected: string) {
  assert.ok(date);
  const normalized = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  assert.equal(normalized, expected);
}

test("ranking period presets resolve month, quarter, semester, and year boundaries", () => {
  const now = new Date(2026, 6, 31, 12, 0, 0);
  const scenarios = [
    ["month", "2026-07-01", "2026-08-01"],
    ["quarter", "2026-07-01", "2026-10-01"],
    ["semester", "2026-07-01", "2027-01-01"],
    ["year", "2026-01-01", "2027-01-01"],
  ] as const;

  for (const [period, expectedStart, expectedEnd] of scenarios) {
    const resolved = resolveRankingPeriod({ period }, [], now);
    assert.equal(resolved.mode, period);
    assertLocalDate(resolved.start, expectedStart);
    assertLocalDate(resolved.endExclusive, expectedEnd);
  }
});

test("ranking day boundaries use the arena time zone", () => {
  const resolved = resolveRankingPeriod(
    { period: "month" },
    [],
    new Date("2026-07-31T12:00:00.000Z"),
    "America/New_York",
  );
  assert.equal(resolved.start.toISOString(), "2026-07-01T04:00:00.000Z");
  assert.equal(resolved.endExclusive?.toISOString(), "2026-08-01T04:00:00.000Z");
});

test("custom ranking period is inclusive and rejects inverted dates", () => {
  const now = new Date(2026, 6, 31, 12, 0, 0);
  const resolved = resolveRankingPeriod(
    { period: "custom", start: "2026-07-10", end: "2026-07-12" },
    [],
    now,
  );
  assert.equal(resolved.mode, "custom");
  assertLocalDate(resolved.start, "2026-07-10");
  assertLocalDate(resolved.endExclusive, "2026-07-13");
  assert.equal(resolved.query.start, "2026-07-10");
  assert.equal(resolved.query.end, "2026-07-12");

  const invalid = resolveRankingPeriod(
    { period: "custom", start: "2026-07-12", end: "2026-07-10" },
    [],
    now,
  );
  assert.match(invalid.error ?? "", /inicial.*final/i);
});

test("cycle ranking period uses the selected named cycle range", () => {
  const resolved = resolveRankingPeriod(
    { period: "cycle", cycleId: "cycle-2" },
    [{
      id: "cycle-2",
      label: "2Âº semestre 2026",
      startedAt: new Date(2026, 6, 1),
      endedAt: new Date(2026, 11, 31, 23, 59, 59, 999),
    }],
    new Date(2026, 6, 31),
  );

  assert.equal(resolved.mode, "cycle");
  assert.equal(resolved.label, "2Âº semestre 2026");
  assert.equal(resolved.query.cycleId, "cycle-2");
  assertLocalDate(resolved.start, "2026-07-01");
  assertLocalDate(resolved.endExclusive, "2027-01-01");
});

test("ranking period selection is preserved across every workspace tab", () => {
  const [page, tabs] = [
    readFileSync(path.join(workspaceRoot, "src", "app", "(app)", "torneios", "rankings", "[rankingId]", "page.tsx"), "utf8"),
    readFileSync(path.join(workspaceRoot, "src", "components", "tournaments", "ranking-workspace-tabs.tsx"), "utf8"),
  ];

  assert.match(page, /periodQuery/);
  assert.match(page, /Mês atual/);
  assert.match(page, /Trimestre atual/);
  assert.match(page, /Semestre atual/);
  assert.match(page, /Ano atual/);
  assert.match(page, /Personalizado/);
  assert.match(page, /Novo ciclo/);
  assert.match(tabs, /periodQuery/);
  assert.match(tabs, /Object\.entries\(periodQuery\)/);
});

test("ranking workspace creates named cycles and filters usage by the active range", () => {
  const [page, actions] = [
    readFileSync(path.join(workspaceRoot, "src", "app", "(app)", "torneios", "rankings", "[rankingId]", "page.tsx"), "utf8"),
    readFileSync(path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"), "utf8"),
  ];

  assert.match(page, /createRankingCycleAction/);
  assert.match(page, /name="label"/);
  assert.match(page, /name="startedAt"/);
  assert.match(page, /name="endedAt"/);
  assert.match(page, /createdAt:\s*\{[\s\S]*gte:\s*ranking\.period\.start/);
  assert.match(actions, /export async function createRankingCycleAction/);
  assert.match(actions, /rankingCycle\.create/);
});
