import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  updateRankingConfigurationSchema,
  type RankingModel,
} from "../src/lib/validators/ranking";
import * as rankingValidators from "../src/lib/validators/ranking";
import { buildPlacementStages } from "../src/lib/tournament-category/ranking";

const workspaceRoot = process.cwd();

type RankingRuleBlueprint = {
  stageKey: string;
  field: string;
};

const validKnockoutRanking = {
  name: "Ranking eliminatório",
  description: "",
  type: "PAIR",
  model: "KNOCKOUT",
  isGeneral: false,
  championPoints: 200,
  runnerUpPoints: 140,
  semifinalPoints: 90,
  quarterfinalPoints: 50,
  participationPoints: 20,
};

test("ranking models expose only their supported rule keys", () => {
  const getRankingRuleBlueprint = (
    rankingValidators as typeof rankingValidators & {
      getRankingRuleBlueprint?: (
        model: RankingModel,
      ) => RankingRuleBlueprint[];
    }
  ).getRankingRuleBlueprint;

  assert.equal(typeof getRankingRuleBlueprint, "function");
  assert.deepEqual(
    getRankingRuleBlueprint?.("LEAGUE").map((rule) => rule.stageKey),
    ["CHAMPION", "RUNNER_UP", "THIRD", "PARTICIPATION"],
  );
  assert.deepEqual(
    getRankingRuleBlueprint?.("KNOCKOUT").map((rule) => rule.stageKey),
    [
      "CHAMPION",
      "RUNNER_UP",
      "SEMIFINAL",
      "QUARTERFINAL",
      "PARTICIPATION",
    ],
  );
});

test("League placement uses its configurable third-place rule", () => {
  const stages = buildPlacementStages({
    format: "LEAGUE",
    pairIds: ["pair-1", "pair-2", "pair-3", "pair-4"],
    matches: [],
    leagueOrder: ["pair-2", "pair-1", "pair-4", "pair-3"],
  });

  assert.deepEqual(Object.fromEntries(stages), {
    "pair-1": "RUNNER_UP",
    "pair-2": "CHAMPION",
    "pair-3": "PARTICIPATION",
    "pair-4": "THIRD",
  });
});

test("ranking validation keeps type and model separate", () => {
  const league = rankingValidators.createRankingProfileSchema.safeParse({
    name: "Liga anual",
    description: "",
    type: "INDIVIDUAL",
    model: "LEAGUE",
    isGeneral: true,
    championPoints: 200,
    runnerUpPoints: 140,
    thirdPoints: 90,
    participationPoints: 20,
  });
  const knockout =
    rankingValidators.createRankingProfileSchema.safeParse(
      validKnockoutRanking,
    );

  assert.equal(league.success, true);
  assert.equal(league.data?.type, "INDIVIDUAL");
  assert.equal(league.data?.model, "LEAGUE");
  assert.equal(league.data?.isGeneral, true);
  assert.equal(league.data?.thirdPoints, 90);
  assert.equal(knockout.success, true);
  assert.equal(knockout.data?.model, "KNOCKOUT");
  assert.equal(knockout.data?.semifinalPoints, 90);
  assert.equal(knockout.data?.quarterfinalPoints, 50);
});

test("ranking configuration accepts a name-only update", () => {
  const parsed = updateRankingConfigurationSchema.safeParse({
    rankingId: "ranking-1",
    name: "Liga Masculina 2026",
    description: "",
  });

  assert.equal(parsed.success, true);
});

test("ranking configuration maps duplicate names to readable text", async () => {
  const actions = await readFile(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );

  assert.match(actions, /function getRankingUpdateError\(error: unknown\)/);
  assert.match(
    actions,
    /getRankingUpdateError[\s\S]*P2002[\s\S]*Já existe um ranking com este nome na arena\./,
  );
});

test("only an individual ranking can be the arena General Ranking", () => {
  const parsed = rankingValidators.createRankingProfileSchema.safeParse({
    ...validKnockoutRanking,
    type: "PAIR",
    isGeneral: true,
  });

  assert.equal(parsed.success, false);
  assert.match(
    parsed.error?.issues[0]?.message ?? "",
    /Ranking Geral.*individual/i,
  );
});

test("ranking persistence stores model and one General Ranking per arena", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "prisma", "schema.prisma"),
    "utf8",
  );
  const migrationNames = await readdir(
    path.join(workspaceRoot, "prisma", "migrations"),
  );
  const migrationName = migrationNames.find((name) =>
    name.includes("ranking_models_and_general"),
  );

  assert.match(schema, /enum RankingModel\s*\{[\s\S]*LEAGUE[\s\S]*KNOCKOUT/);
  assert.match(
    schema,
    /model\s+RankingProfile\s*\{[\s\S]*model\s+RankingModel\s+@default\(KNOCKOUT\)/,
  );
  assert.match(
    schema,
    /model\s+RankingProfile\s*\{[\s\S]*isGeneral\s+Boolean\s+@default\(false\)/,
  );
  assert.ok(migrationName, "ranking model migration is missing");

  const migration = await readFile(
    path.join(
      workspaceRoot,
      "prisma",
      "migrations",
      migrationName ?? "",
      "migration.sql",
    ),
    "utf8",
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX[\s\S]*"RankingProfile"[\s\S]*\("arenaId"\)[\s\S]*WHERE "isGeneral" = true/i,
  );
});

test("ranking migration backfills exclusive League links and rejects ambiguous consumers", async () => {
  const migrationNames = await readdir(
    path.join(workspaceRoot, "prisma", "migrations"),
  );
  const migrationName = migrationNames.find((name) =>
    name.includes("ranking_model_compatibility"),
  );

  assert.ok(migrationName, "ranking compatibility migration is missing");
  const migration = await readFile(
    path.join(
      workspaceRoot,
      "prisma",
      "migrations",
      migrationName ?? "",
      "migration.sql",
    ),
    "utf8",
  );

  assert.match(migration, /RAISE EXCEPTION[\s\S]*LEAGUE[\s\S]*KNOCKOUT/i);
  assert.match(
    migration,
    /RAISE EXCEPTION[\s\S]*LEAGUE[\s\S]*legacy tournament/i,
  );
  assert.match(
    migration,
    /UPDATE "RankingProfile"[\s\S]*SET "model" = 'LEAGUE'[\s\S]*"CategoryCompetition"[\s\S]*"format" = 'LEAGUE'/,
  );
  assert.match(
    migration,
    /INSERT INTO "RankingRule"[\s\S]*'THIRD'[\s\S]*COALESCE[\s\S]*'SEMIFINAL'/,
  );
  assert.match(
    migration,
    /DELETE FROM "RankingRule"[\s\S]*IN \('SEMIFINAL', 'QUARTERFINAL'\)/,
  );
  assert.match(
    migration,
    /UPDATE "RankingRule"[\s\S]*"displayOrder" = 4[\s\S]*'PARTICIPATION'/,
  );
});

test("ranking actions and forms synchronize model-aware rules", async () => {
  const [actions, form, page] = await Promise.all([
    readFile(
      path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "forms",
        "ranking-profile-form.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "app",
        "(app)",
        "torneios",
        "rankings",
        "page.tsx",
      ),
      "utf8",
    ),
  ]);

  assert.match(actions, /model:\s*formData\.get\("model"\)/);
  assert.match(actions, /isGeneral:\s*formData\.get\("isGeneral"\)\s*===\s*"on"/);
  assert.match(actions, /getRankingRuleBlueprint\(values\.model\)/);
  assert.match(actions, /rankingRule\.deleteMany/);
  assert.match(form, /name="model"/);
  assert.match(form, /value="LEAGUE"/);
  assert.match(form, /value="KNOCKOUT"/);
  assert.match(form, /name="isGeneral"/);
  assert.match(form, /name="thirdPoints"/);
  assert.match(form, /name="semifinalPoints"/);
  assert.match(form, /name="quarterfinalPoints"/);
  assert.match(page, /RankingProfileFields/);
});

test("a ranking model cannot change beneath an incompatible category table", async () => {
  const actions = await readFile(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );
  const updateAction = actions.slice(
    actions.indexOf("export async function updateRankingProfileAction"),
    actions.indexOf("export async function resetRankingPointsAction"),
  );

  assert.match(updateAction, /linkedIncompatibleCategoryCount/);
  assert.match(updateAction, /format:\s*\{\s*not:\s*"LEAGUE"\s*\}/);
  assert.match(updateAction, /format:\s*"LEAGUE"/);
  assert.match(updateAction, /modelo.*categorias vinculadas/i);
});

test("legacy tournaments only select and accept individual knockout rankings", async () => {
  const [newEventPage, eventPage, actions, tournamentService] =
    await Promise.all([
      readFile(
        path.join(
          workspaceRoot,
          "src",
          "app",
          "(app)",
          "torneios",
          "novo",
          "page.tsx",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          workspaceRoot,
          "src",
          "app",
          "(app)",
          "torneios",
          "[tournamentId]",
          "page.tsx",
        ),
        "utf8",
      ),
      readFile(
        path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
        "utf8",
      ),
      readFile(
        path.join(workspaceRoot, "src", "lib", "services", "tournament.ts"),
        "utf8",
      ),
    ]);

  for (const source of [newEventPage, eventPage]) {
    const rankingQuery = source.slice(
      source.indexOf("prisma.rankingProfile.findMany"),
      source.indexOf("orderBy:", source.indexOf("prisma.rankingProfile.findMany")),
    );
    assert.match(rankingQuery, /type:\s*"INDIVIDUAL"/);
    assert.match(rankingQuery, /model:\s*"KNOCKOUT"/);
  }

  const actionGuard = actions.slice(
    actions.indexOf("async function ensureRankingBelongsToArena"),
    actions.indexOf("async function syncRankingRules"),
  );
  const serviceGuard = tournamentService.slice(
    tournamentService.indexOf("async function lockIndividualRanking"),
    tournamentService.indexOf("function getGroupLabelByOrder"),
  );
  assert.match(actionGuard, /type:\s*"INDIVIDUAL"[\s\S]*model:\s*"KNOCKOUT"/);
  assert.match(serviceGuard, /type:\s*"INDIVIDUAL"[\s\S]*model:\s*"KNOCKOUT"/);
});

test("a legacy-linked ranking cannot change to the League model", async () => {
  const actions = await readFile(
    path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
    "utf8",
  );
  const updateAction = actions.slice(
    actions.indexOf("export async function updateRankingProfileAction"),
    actions.indexOf("export async function resetRankingPointsAction"),
  );

  assert.match(updateAction, /linkedLegacyTournamentCount/);
  assert.match(updateAction, /parsed\.data\.model\s*===\s*"LEAGUE"/);
  assert.match(updateAction, /Mata-mata.*torneios vinculados/i);
});

test("editing an existing event submits its name and refreshes its detail", async () => {
  const [form, actions] = await Promise.all([
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "forms",
        "tournament-form.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
      "utf8",
    ),
  ]);

  assert.match(form, /mode\s*===\s*"update"/);
  assert.match(form, /name="tournamentId"/);
  assert.match(form, /name="name"/);

  const updateAction = actions.slice(
    actions.indexOf("export async function updateTournamentAction"),
    actions.indexOf("export async function createRankingProfileAction"),
  );
  assert.match(updateAction, /name:\s*formData\.get\("name"\)/);
  assert.match(updateAction, /name:\s*parsed\.data\.name/);
  assert.match(
    updateAction,
    /revalidatePath\(`\/torneios\/\$\{parsed\.data\.tournamentId\}`\)/,
  );
});
