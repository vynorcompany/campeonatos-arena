import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { updateCategoryMatchScheduleSchema } from "../src/lib/validators/category-competition";
import { getAvailableCategoryAthletes } from "../src/lib/tournament-category/eligibility";

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
  assert.match(registrationPanel, /const availableAthletes =/);
  assert.match(registrationPanel, /getAvailableCategoryAthletes\(/);
  assert.match(categoryRoute, /playerIds:\s*pair\.players\.map/);
  assert.match(categoryRoute, /scheduledDate:\s*match\.scheduledDate/);
  assert.match(categoryRoute, /scheduledTime:\s*match\.scheduledTime/);
});
