import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addManualPairSchema,
  createCategoryCompetitionSchema,
} from "../src/lib/validators/category-competition";
import { createPlayerSchema } from "../src/lib/validators/player";
import { validateManualPairEligibility } from "../src/lib/tournament-category/eligibility";
import { CATEGORY_CLASS_OPTIONS } from "../src/lib/tournament-category/options";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actionsPath = path.join(workspaceRoot, "src", "lib", "actions", "category-competition.ts");

test("manual pairs reject the same athlete in both slots", () => {
  const parsed = addManualPairSchema.safeParse({
    competitionId: "competition-1",
    firstPlayerId: "player-1",
    secondPlayerId: "player-1",
  });

  assert.equal(parsed.success, false);
  assert.match(parsed.error?.issues[0]?.message ?? "", /atletas diferentes/i);
});

test("every category competition lifecycle action requires tournament edit access", async () => {
  const source = await readFile(actionsPath, "utf8");
  const actionNames = [
    "createCategoryCompetitionAction",
    "addManualPairAction",
    "removeCategoryPairAction",
    "generateCategoryDrawAction",
    "moveCategoryPairAction",
    "publishCategoryDrawAction",
    "recordCategoryMatchResultAction",
    "finishCategoryCompetitionAction",
  ];

  for (const actionName of actionNames) {
    assert.match(
      source,
      new RegExp(
        `export async function ${actionName}\\([^]*?requireModuleEdit\\(\"tournaments\"\\)`,
      ),
      `${actionName} must require tournament edit access`,
    );
  }
});

test("manual pair eligibility is arena, activity, class and gender scoped", () => {
  const category = {
    arenaId: "arena-1",
    className: "5ª",
    gender: "FEMININO",
  };
  const eligiblePlayers = [
    { id: "player-1", arenaId: "arena-1", active: true, className: "5ª", gender: "FEMININO" },
    { id: "player-2", arenaId: "arena-1", active: true, className: "5ª", gender: "FEMININO" },
  ];

  assert.doesNotThrow(() =>
    validateManualPairEligibility(category, eligiblePlayers, []),
  );
  assert.throws(
    () =>
      validateManualPairEligibility(
        category,
        [eligiblePlayers[0], { ...eligiblePlayers[1], arenaId: "arena-2" }],
        [],
      ),
    /arena/i,
  );
  assert.throws(
    () =>
      validateManualPairEligibility(
        category,
        [eligiblePlayers[0], { ...eligiblePlayers[1], active: false }],
        [],
      ),
    /inativo/i,
  );
  assert.throws(
    () =>
      validateManualPairEligibility(
        category,
        [eligiblePlayers[0], { ...eligiblePlayers[1], className: "4ª" }],
        [],
      ),
    /classe/i,
  );
  assert.throws(
    () =>
      validateManualPairEligibility(
        category,
        [eligiblePlayers[0], { ...eligiblePlayers[1], gender: "MASCULINO" }],
        [],
      ),
    /gênero/i,
  );
});

test("manual pair eligibility rejects an existing pair regardless of slot order", () => {
  const players = [
    { id: "player-1", arenaId: "arena-1", active: true, className: "5ª", gender: "FEMININO" },
    { id: "player-2", arenaId: "arena-1", active: true, className: "5ª", gender: "FEMININO" },
  ];

  assert.throws(
    () =>
      validateManualPairEligibility(
        { arenaId: "arena-1", className: "5ª", gender: "FEMININO" },
        players,
        [["player-2", "player-1"]],
      ),
    /já está inscrita/i,
  );
});

test("category classes are limited to the supported ordinal options", () => {
  assert.deepEqual(CATEGORY_CLASS_OPTIONS, ["3ª", "4ª", "5ª", "6ª", "7ª"]);
});

test("category competition configuration only accepts standard class and gender values", () => {
  const validInput = {
    categoryId: "category-1",
    class: "5ª",
    gender: "FEMININO",
    format: "LEAGUE",
    rankingId: null,
    feedsGeneralRanking: false,
  };

  assert.equal(createCategoryCompetitionSchema.safeParse(validInput).success, true);
  assert.equal(
    createCategoryCompetitionSchema.safeParse({ ...validInput, class: "5a" }).success,
    false,
  );
  assert.equal(
    createCategoryCompetitionSchema.safeParse({ ...validInput, gender: "MISTO" }).success,
    false,
  );
});

test("manual pair eligibility treats legacy class spellings as the same class", () => {
  const category = {
    arenaId: "arena-1",
    className: "5ª",
    gender: "FEMININO",
  };
  const players = [
    { id: "player-1", arenaId: "arena-1", active: true, className: "5a", gender: "FEMININO" },
    { id: "player-2", arenaId: "arena-1", active: true, className: "5", gender: "FEMININO" },
  ];

  assert.doesNotThrow(() =>
    validateManualPairEligibility(category, players, []),
  );
});

test("the athlete master captures class and gender used by category eligibility", async () => {
  const [form, editForm, actions] = await Promise.all([
    readFile(
      path.join(workspaceRoot, "src", "components", "forms", "player-form.tsx"),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "players",
        "player-actions-cell.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
      "utf8",
    ),
  ]);

  assert.match(form, /name="class"/);
  assert.match(form, /name="gender"/);
  assert.match(editForm, /name="class"/);
  assert.match(editForm, /name="gender"/);
  assert.match(actions, /class:\s*formData\.get\("class"\)/);
  assert.match(actions, /gender:\s*formData\.get\("gender"\)/);
});

test("athlete eligibility migration reuses the existing athlete profile columns safely", async () => {
  const [schema, migration] = await Promise.all([
    readFile(path.join(workspaceRoot, "prisma", "schema.prisma"), "utf8"),
    readFile(
      path.join(
        workspaceRoot,
        "prisma",
        "migrations",
        "20260730160000_category_ranking_applications",
        "migration.sql",
      ),
      "utf8",
    ),
  ]);

  assert.match(schema, /class\s+String\s+@default\(""\)\s+@map\("category"\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "category"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "gender"/);
  assert.match(migration, /ALTER COLUMN "gender" SET NOT NULL/);
});

test("legacy athlete submissions without eligibility fields keep compatible empty defaults", () => {
  const parsed = createPlayerSchema.safeParse({
    name: "Atleta legado",
    points: 1000,
    class: null,
    gender: null,
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.class, "");
  assert.equal(parsed.data?.gender, "");
});

test("category lifecycle service connects draft draw, publication, results and one-time finish", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "lib",
      "services",
      "category-competition.ts",
    ),
    "utf8",
  );

  assert.match(source, /buildGroups\(/);
  assert.match(source, /status:\s*categoryCompetitionStatus\.DRAFT/);
  assert.match(source, /categoryMatch\.deleteMany/);
  assert.match(source, /selectQuarterfinalists\(/);
  assert.match(source, /buildRoundRobin\(/);
  assert.match(source, /buildKnockout\(/);
  assert.match(source, /rankStandings\(/);
  assert.match(source, /advanceKnockoutWinner\(/);
  assert.match(source, /categoryRankingApplication\.create/);
  assert.match(source, /points:\s*\{\s*increment:\s*points/);
});

test("all category lifecycle mutations use retryable serializable transactions", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "lib",
      "services",
      "category-competition.ts",
    ),
    "utf8",
  );

  assert.match(source, /async function runSerializableTransaction/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
  assert.match(source, /error\.code === "P2034"/);
  assert.match(source, /return runSerializableTransaction\(/);
});

test("category configuration ignores General Ranking feed sent by the client", () => {
  const parsed = createCategoryCompetitionSchema.safeParse({
    categoryId: "category-1",
    class: "5ª",
    gender: "Feminino",
    format: "LEAGUE",
    rankingId: null,
    feedsGeneralRanking: true,
  });

  assert.equal(parsed.success, true);
  assert.equal("feedsGeneralRanking" in (parsed.data ?? {}), false);
});

test("category creation locks the selected ranking row before reading the category", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "lib",
      "services",
      "category-competition.ts",
    ),
    "utf8",
  );
  const createCategoryCompetitionSource = source.slice(
    source.indexOf("export async function createCategoryCompetition"),
    source.indexOf("export async function updateCategoryPublicVisibility"),
  );
  const rankingReadIndex = createCategoryCompetitionSource.indexOf(
    "const rankingRows = await tx.$queryRaw",
  );
  const categoryReadIndex = createCategoryCompetitionSource.indexOf(
    "const category = await tx.tournamentCategory.findFirst",
  );

  assert.doesNotMatch(
    createCategoryCompetitionSource,
    /const rankingSettings = await resolveCompetitionRankingSettings/,
  );
  assert.doesNotMatch(
    createCategoryCompetitionSource,
    /lockRankingProfile\(tx, input\.rankingId\)/,
  );
  assert.match(
    createCategoryCompetitionSource,
    /SELECT "id", "model", "feedsGeneralRanking"[\s\S]*FOR UPDATE/,
  );
  assert.ok(rankingReadIndex >= 0);
  assert.ok(categoryReadIndex > rankingReadIndex);
  assert.match(
    createCategoryCompetitionSource,
    /feedsGeneralRanking = ranking\.feedsGeneralRanking;[\s\S]*feedsGeneralRanking,/,
  );
});
