import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  removeCategoryPairSchema,
  updateCategoryMatchScheduleSchema,
} from "../src/lib/validators/category-competition";
import {
  getAvailableCategoryAthletes,
  validateManualPairEligibility,
} from "../src/lib/tournament-category/eligibility";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("category match schedule accepts valid manual date and time and rejects invalid values", () => {
  const valid = updateCategoryMatchScheduleSchema.safeParse({
    matchId: "match-1",
    scheduledDate: "2026-07-30",
    scheduledTime: "19:45",
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.deepEqual(valid.data, {
      matchId: "match-1",
      scheduledDate: "2026-07-30",
      scheduledTime: "19:45",
    });
  }

  const cleared = updateCategoryMatchScheduleSchema.safeParse({
    matchId: "match-1",
    scheduledDate: "",
    scheduledTime: "",
  });
  assert.equal(cleared.success, true);
  if (cleared.success) {
    assert.equal(cleared.data.scheduledDate, null);
    assert.equal(cleared.data.scheduledTime, null);
  }

  assert.equal(
    updateCategoryMatchScheduleSchema.safeParse({
      matchId: "match-1",
      scheduledDate: "2026-02-30",
      scheduledTime: "19:45",
    }).success,
    false,
  );
  assert.equal(
    updateCategoryMatchScheduleSchema.safeParse({
      matchId: "match-1",
      scheduledDate: "2026-07-30",
      scheduledTime: "24:00",
    }).success,
    false,
  );
  assert.equal(
    updateCategoryMatchScheduleSchema.safeParse({
      matchId: "match-1",
      scheduledDate: "2026-07-30",
      scheduledTime: "",
    }).success,
    false,
  );
  assert.equal(
    updateCategoryMatchScheduleSchema.safeParse({
      matchId: "match-1",
      scheduledDate: "",
      scheduledTime: "19:45",
    }).success,
    false,
  );
});

test("paired athletes are unavailable only in the category containing their pair", () => {
  const athletes = [
    { id: "athlete-1", name: "Ana" },
    { id: "athlete-2", name: "Bia" },
    { id: "athlete-3", name: "Clara" },
  ];
  const categories = [
    { id: "category-1", pairedPlayerIds: ["athlete-1"] },
    { id: "category-2", pairedPlayerIds: [] },
  ];
  const availableAthletes = Object.fromEntries(
    categories.map((category) => [
      category.id,
      getAvailableCategoryAthletes(
        athletes,
        category.pairedPlayerIds,
      ).map((athlete) => athlete.id),
    ]),
  );

  assert.deepEqual(availableAthletes["category-1"], [
    "athlete-2",
    "athlete-3",
  ]);
  assert.deepEqual(availableAthletes["category-2"], [
    "athlete-1",
    "athlete-2",
    "athlete-3",
  ]);
});

test("an athlete already paired in a category cannot join another pair in that category", () => {
  const category = {
    arenaId: "arena-1",
    className: "5ª",
    gender: "FEMININO",
  };
  const players = [
    {
      id: "player-1",
      arenaId: "arena-1",
      active: true,
      className: "5ª",
      gender: "FEMININO",
    },
    {
      id: "player-3",
      arenaId: "arena-1",
      active: true,
      className: "5ª",
      gender: "FEMININO",
    },
  ];

  assert.throws(
    () =>
      validateManualPairEligibility(category, players, [
        ["player-1", "player-2"],
      ]),
    /já.*dupla|vinculado/i,
  );
});

test("category pair membership is protected by a competition-player database constraint", async () => {
  const prismaSchema = await readFile(
    path.join(workspaceRoot, "prisma", "schema.prisma"),
    "utf8",
  );
  const migrationDirectories = await readdir(
    path.join(workspaceRoot, "prisma", "migrations"),
  );
  const migrationDirectory = migrationDirectories.find((directory) =>
    directory.endsWith("_category_pair_player_competition"),
  );

  assert.match(
    prismaSchema,
    /model CategoryPairPlayer[^]*competitionId\s+String[^]*@@unique\(\[competitionId,\s*playerId\]\)/,
  );
  assert.ok(
    migrationDirectory,
    "a migration must enforce one player per category competition",
  );

  const migration = await readFile(
    path.join(
      workspaceRoot,
      "prisma",
      "migrations",
      migrationDirectory,
      "migration.sql",
    ),
    "utf8",
  );
  assert.match(migration, /ADD COLUMN "competitionId" TEXT/);
  assert.match(migration, /UPDATE "CategoryPairPlayer"/);
  assert.match(
    migration,
    /UNIQUE INDEX "CategoryPairPlayer_competitionId_playerId_key"/,
  );
});

test("draft category pairs can be removed through a guarded service and action", async () => {
  assert.equal(
    removeCategoryPairSchema.safeParse({ pairId: "pair-1" }).success,
    true,
  );
  assert.equal(removeCategoryPairSchema.safeParse({ pairId: "" }).success, false);

  const [service, actions, registrationPanel] = await Promise.all([
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "lib",
        "services",
        "category-competition.ts",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "lib",
        "actions",
        "category-competition.ts",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "category-registration-panel.tsx",
      ),
      "utf8",
    ),
  ]);

  assert.match(
    service,
    /export async function removeCategoryPair\([^]*status:\s*categoryCompetitionStatus\.DRAFT/,
  );
  assert.match(
    service,
    /removeCategoryPair\([^]*categoryMatch\.deleteMany[^]*categoryGroup\.deleteMany[^]*categoryPair\.delete/,
  );
  assert.match(
    actions,
    /export async function removeCategoryPairAction\([^]*requireModuleEdit\("tournaments"\)/,
  );
  assert.match(registrationPanel, /action=\{removeCategoryPairAction\}/);
  assert.match(
    registrationPanel,
    /\{canRemovePair\s*\?[^]*action=\{removeCategoryPairAction\}/,
  );

  const athletes = [
    { id: "player-1", name: "Ana" },
    { id: "player-2", name: "Bia" },
  ];
  assert.deepEqual(
    getAvailableCategoryAthletes(athletes, ["player-1", "player-2"]),
    [],
  );
  assert.deepEqual(getAvailableCategoryAthletes(athletes, []), athletes);
});

test("category schedule and availability are wired through schema, service, action, route and forms", async () => {
  const [
    prismaSchema,
    service,
    actions,
    resultsPanel,
    registrationPanel,
    categoryRoute,
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, "prisma", "schema.prisma"), "utf8"),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "lib",
        "services",
        "category-competition.ts",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "lib",
        "actions",
        "category-competition.ts",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "category-results-panel.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "category-registration-panel.tsx",
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
        "categorias",
        "[categoryId]",
        "page.tsx",
      ),
      "utf8",
    ),
  ]);

  assert.match(
    prismaSchema,
    /model CategoryMatch[^]*scheduledDate\s+String\?/,
  );
  assert.match(service, /export async function updateCategoryMatchSchedule\(/);
  assert.match(
    service,
    /updateCategoryMatchSchedule\([^]*tournament:\s*\{\s*arenaId\s*\}/,
  );
  assert.match(
    actions,
    /export async function updateCategoryMatchScheduleAction\([^]*requireModuleEdit\("tournaments"\)/,
  );
  assert.match(resultsPanel, /action=\{updateCategoryMatchScheduleAction\}/);
  assert.match(resultsPanel, /type="date"/);
  assert.match(resultsPanel, /type="time"/);
  assert.match(
    resultsPanel,
    /name="scheduledDate"[^>]*type="date"[^>]*required/,
  );
  assert.match(
    resultsPanel,
    /name="scheduledTime"[^>]*type="time"[^>]*required/,
  );
  assert.match(registrationPanel, /const availableAthletes =/);
  assert.match(registrationPanel, /getAvailableCategoryAthletes\(/);
  assert.match(categoryRoute, /playerIds:\s*pair\.players\.map/);
  assert.match(categoryRoute, /scheduledDate:\s*match\.scheduledDate/);
  assert.match(categoryRoute, /scheduledTime:\s*match\.scheduledTime/);
});
