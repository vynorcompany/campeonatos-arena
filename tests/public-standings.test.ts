import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  buildPublicCategoryStandings,
  selectPublicStandingsOptions,
  type PublicStandingsCategorySource,
} from "../src/lib/public-standings";

const workspaceRoot = process.cwd();

test("public standings list only the General Ranking and public finished categories with their event", () => {
  const categories: PublicStandingsCategorySource[] = [
    {
      id: "finished-public",
      name: "5ª Feminina",
      eventName: "Open de Inverno",
      isPublic: true,
      status: "FINISHED",
    },
    {
      id: "finished-private",
      name: "4ª Masculina",
      eventName: "Open de Inverno",
      isPublic: false,
      status: "FINISHED",
    },
    {
      id: "published-public",
      name: "3ª Mista",
      eventName: "Copa da Arena",
      isPublic: true,
      status: "PUBLISHED",
    },
  ];

  const options = selectPublicStandingsOptions({
    generalRanking: {
      id: "general",
      name: "Ranking anual",
      active: true,
      isGeneral: true,
      type: "INDIVIDUAL",
    },
    categories,
  });

  assert.deepEqual(
    options.map(({ id, kind, label }) => ({ id, kind, label })),
    [
      {
        id: "ranking:general",
        kind: "GENERAL_RANKING",
        label: "Ranking Geral · Ranking anual",
      },
      {
        id: "category:finished-public",
        kind: "CATEGORY",
        label: "5ª Feminina · Open de Inverno",
      },
    ],
  );
});

test("public standings omit a ranking that is not the configured General Ranking", () => {
  const options = selectPublicStandingsOptions({
    generalRanking: {
      id: "pair-ranking",
      name: "Ranking de duplas",
      active: true,
      isGeneral: false,
      type: "PAIR",
    },
    categories: [],
  });

  assert.deepEqual(options, []);
});

test("public League standings use completed sports matches without ranking points", () => {
  const standings = buildPublicCategoryStandings({
    format: "LEAGUE",
    pairs: [
      { id: "pair-a", name: "Ana / Bia" },
      { id: "pair-b", name: "Clara / Duda" },
    ],
    matches: [
      {
        stage: "GROUP",
        homePairId: "pair-a",
        awayPairId: "pair-b",
        winnerPairId: "pair-a",
        homeScore: 6,
        awayScore: 3,
      },
    ],
  });

  assert.deepEqual(standings.leagueStandings, [
    {
      position: 1,
      pairName: "Ana / Bia",
      matches: 1,
      victories: 1,
      losses: 0,
      differential: 3,
    },
    {
      position: 2,
      pairName: "Clara / Duda",
      matches: 1,
      victories: 0,
      losses: 1,
      differential: -3,
    },
  ]);
  assert.deepEqual(standings.knockoutPlacement, []);
  assert.equal("totalPoints" in standings.leagueStandings[0], false);
});

test("public knockout standings expose only champion and runner-up", () => {
  const standings = buildPublicCategoryStandings({
    format: "SIMPLE",
    pairs: [
      { id: "champion", name: "Eva / Fabi" },
      { id: "runner-up", name: "Gabi / Helena" },
    ],
    matches: [
      {
        stage: "FINAL",
        homePairId: "champion",
        awayPairId: "runner-up",
        winnerPairId: "champion",
        homeScore: 6,
        awayScore: 4,
      },
    ],
  });

  assert.deepEqual(standings.knockoutPlacement, [
    { position: 1, pairName: "Eva / Fabi" },
    { position: 2, pairName: "Gabi / Helena" },
  ]);
  assert.deepEqual(standings.leagueStandings, []);
});

test("category visibility is persisted and wired through its guarded admin action", async () => {
  const [schema, validator, action, service, form] = await Promise.all([
    readFile(path.join(workspaceRoot, "prisma", "schema.prisma"), "utf8"),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "lib",
        "validators",
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
        "components",
        "tournaments",
        "category-competition-form.tsx",
      ),
      "utf8",
    ),
  ]);
  const migrationNames = await readdir(
    path.join(workspaceRoot, "prisma", "migrations"),
  );

  assert.match(
    schema,
    /model\s+CategoryCompetition\s*\{[\s\S]*isPublic\s+Boolean\s+@default\(false\)/,
  );
  assert.ok(
    migrationNames.some((name) => name.includes("category_public_visibility")),
    "category public visibility migration is missing",
  );
  assert.match(validator, /updateCategoryPublicVisibilitySchema/);
  assert.match(action, /requireModuleEdit\("tournaments"\)/);
  assert.match(action, /updateCategoryPublicVisibilityAction/);
  assert.match(service, /export async function updateCategoryPublicVisibility/);
  assert.match(form, /name="isPublic"/);
  assert.match(form, /Exibir na página pública/);
});

test("public arena route renders ranking and game views", async () => {
  const [route, component, service] = await Promise.all([
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "app",
        "classificacao",
        "[arenaSlug]",
        "page.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "components",
        "tournaments",
        "public-standings.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        workspaceRoot,
        "src",
        "lib",
        "services",
        "public-standings.ts",
      ),
      "utf8",
    ),
  ]);

  assert.match(route, /getArenaPublicStandings/);
  assert.match(route, /tab\?: string/);
  assert.match(route, /league\?: string/);
  assert.match(route, /status\?: string/);
  assert.match(component, />Ranking</);
  assert.match(component, />Jogos</);
  assert.match(component, /<select[\s\S]*name="view"/);
  assert.match(component, /name="league"/);
  assert.match(component, /option value="LIVE">Em andamento/);
  assert.match(component, /Classificação da Liga/);
  assert.match(component, /Colocação final/);
  assert.match(component, /Ranking Geral/);
  assert.doesNotMatch(component, /totalPoints/);
  assert.doesNotMatch(component, /finishCategoryCompetitionAction/);
  assert.match(service, /filterPublicGames\(/);
});

test("public agenda copy is stored as valid Portuguese text", async () => {
  const component = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "public-standings.tsx",
    ),
    "utf8",
  );

  assert.match(component, /Agenda pública/);
  assert.match(component, />Jogos</);
  assert.doesNotMatch(component, /PÃ|Ãƒ/);
});
