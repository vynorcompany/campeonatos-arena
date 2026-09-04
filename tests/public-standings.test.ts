import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  buildPublicGameAgenda,
  buildPublicCategoryStandings,
  selectPublicStandingsOptions,
  type PublicStandingsCategorySource,
} from "../src/lib/public-standings";

const workspaceRoot = process.cwd();

test("public finished games expose their final score and ordered complete set scores only", () => {
  const [day] = buildPublicGameAgenda([
    {
      eventName: "Open de Inverno",
      categoryName: "5ª Feminina",
      label: "Final",
      stage: "FINAL",
      roundOrder: 1,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "Ana / Bia",
      awayPairName: "Clara / Duda",
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
      homeSet1: 6,
      awaySet1: 4,
      homeSet2: 3,
      awaySet2: 6,
      homeSet3: 10,
      awaySet3: 7,
    },
    {
      eventName: "Open de Inverno",
      categoryName: "5ª Feminina",
      label: "Semifinal",
      stage: "SEMIFINAL",
      roundOrder: 2,
      scheduledDate: "2026-08-02",
      scheduledTime: "19:00",
      homePairName: "Eva / Fabi",
      awayPairName: "Gabi / Helena",
      status: "LIVE",
      homeScore: 1,
      awayScore: 0,
      homeSet1: 6,
      awaySet1: 2,
    },
  ]);

  assert.deepEqual(day.games[0].finalScore, { homeScore: 2, awayScore: 1 });
  assert.deepEqual(day.games[0].setScores, [
    { homeScore: 6, awayScore: 4 },
    { homeScore: 3, awayScore: 6 },
    { homeScore: 10, awayScore: 7 },
  ]);
  assert.equal(day.games[1].finalScore, undefined);
  assert.equal(day.games[1].setScores, undefined);
});

test("public standings service selects and maps results only for finished games", async () => {
  const service = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "lib",
      "services",
      "public-standings.ts",
    ),
    "utf8",
  );

  for (const field of [
    "homeScore",
    "awayScore",
    "homeSet1",
    "awaySet1",
    "homeSet2",
    "awaySet2",
    "homeSet3",
    "awaySet3",
  ]) {
    assert.match(service, new RegExp(`${field}:\\s*true`));
  }
  assert.match(service, /const status = match\.winnerPairId\s*\?\s*"FINISHED"/);
  assert.match(service, /status === "FINISHED"/);
  assert.match(service, /homeScore:\s*match\.homeScore/);
  assert.match(service, /awaySet3:\s*match\.awaySet3/);
});

test("public standings renders the branded header and finished-game score treatment", async () => {
  const [component, styles] = await Promise.all([
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
    readFile(path.join(workspaceRoot, "src", "app", "globals.css"), "utf8"),
  ]);

  assert.match(component, /athlete-portal-hero/);
  assert.match(component, /athlete-portal-brand/);
  assert.match(component, /athlete-portal-main-nav/);
  assert.match(component, /Portal do Atleta/);
  assert.match(component, /PublicLeaguePortal/);
  assert.match(styles, /\.athlete-portal-hero\s*\{[^}]*linear-gradient/s);
  assert.match(styles, /\.athlete-portal-main-nav/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.athlete-portal-hero/);
});

test("public game agenda identifies the winning and losing pair in finished games", () => {
  const [day] = buildPublicGameAgenda([
    {
      eventName: "Open de Inverno",
      categoryName: "5ª Feminina",
      label: "Final",
      stage: "FINAL",
      roundOrder: 1,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "Ana / Bia",
      awayPairName: "Clara / Duda",
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
    },
  ]);

  assert.equal(day.games[0].winnerSide, "home");
});

test("public standings use a full-bleed desktop brand band aligned to the page column", async () => {
  const [component, styles] = await Promise.all([
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
    readFile(path.join(workspaceRoot, "src", "app", "globals.css"), "utf8"),
  ]);

  assert.match(component, /athlete-portal-hero-inner/);
  assert.match(component, /athlete-portal-arena-logo/);
  assert.match(component, /athlete-portal-user-avatar/);
  assert.match(styles, /\.athlete-portal-hero-inner\s*\{[^}]*width:\s*min\(100%, 1060px\)/s);
  assert.match(styles, /\.athlete-portal-brand \.athlete-portal-arena-logo\s*\{[^}]*object-fit:\s*contain/s);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.athlete-portal-hero-inner/);
});

test("public standings list only the General Ranking and public finished category names", () => {
  const categories: PublicStandingsCategorySource[] = [
    {
      id: "finished-public",
      name: "5ª Feminina",
      eventName: "Open de Inverno",
      isPublic: true,
      status: "FINISHED",
      format: "LEAGUE",
    },
    {
      id: "finished-private",
      name: "4ª Masculina",
      eventName: "Open de Inverno",
      isPublic: false,
      status: "FINISHED",
      format: "LEAGUE",
    },
    {
      id: "published-public",
      name: "3ª Mista",
      eventName: "Copa da Arena",
      isPublic: true,
      status: "PUBLISHED",
      format: "SIMPLE",
    },
    {
      id: "published-league",
      name: "Liga Masculina A",
      eventName: "Liga de Agosto",
      isPublic: true,
      status: "PUBLISHED",
      format: "LEAGUE",
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
        label: "Ranking Geral",
      },
      {
        id: "category:finished-public",
        kind: "CATEGORY",
        label: "5ª Feminina",
      },
      {
        id: "category:published-league",
        kind: "CATEGORY",
        label: "Liga Masculina A",
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
  assert.match(form, /Exibir no App/);
  assert.match(form, /public-visibility-switch/);
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
  assert.match(component, />\s*Ranking/);
  assert.match(component, />\s*Jogos/);
  assert.match(component, /athlete-portal-hero/);
  assert.match(component, /RankingPanel/);
  assert.match(component, /PublicLeaguePortal/);
  assert.match(component, /Vitórias/);
  assert.match(component, /<select[\s\S]*name="view"/);
  assert.match(component, /leagueCategoryId/);
  assert.match(component, /selectedLeagueTab/);
  assert.match(component, /PortalSection/);
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

  assert.match(component, /Agenda/);
  assert.match(component, />Jogos</);
  assert.doesNotMatch(component, /PÃ|Ãƒ/);
});
