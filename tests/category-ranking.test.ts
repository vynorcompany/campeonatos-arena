import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRankingProfileSchema,
  generalRankingTypeSchema,
} from "../src/lib/validators/ranking";
import {
  buildPlacementAwards,
  buildPlacementStages,
} from "../src/lib/tournament-category/ranking";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const validRanking = {
  name: "Ranking de duplas",
  description: "",
  type: "PAIR",
  championPoints: 200,
  runnerUpPoints: 140,
  semifinalPoints: 90,
  quarterfinalPoints: 50,
  participationPoints: 20,
};

test("ranking validation accepts pair rankings", () => {
  const parsed = createRankingProfileSchema.safeParse(validRanking);

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.type, "PAIR");
});

test("legacy ranking submissions default to pair type", () => {
  const parsed = createRankingProfileSchema.safeParse({
    ...validRanking,
    type: null,
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.type, "PAIR");
});

test("a pair ranking cannot be used as the individual General Ranking", () => {
  const parsed = generalRankingTypeSchema.safeParse("PAIR");

  assert.equal(parsed.success, false);
  assert.match(parsed.error?.issues[0]?.message ?? "", /individual/i);
});

test("knockout placements use configurable points for every stage", () => {
  const stages = buildPlacementStages({
    format: "SIMPLE",
    pairIds: Array.from({ length: 8 }, (_, index) => `pair-${index + 1}`),
    matches: [
      { stage: "QUARTERFINAL", homePairId: "pair-1", awayPairId: "pair-2", winnerPairId: "pair-1" },
      { stage: "QUARTERFINAL", homePairId: "pair-3", awayPairId: "pair-4", winnerPairId: "pair-3" },
      { stage: "QUARTERFINAL", homePairId: "pair-5", awayPairId: "pair-6", winnerPairId: "pair-5" },
      { stage: "QUARTERFINAL", homePairId: "pair-7", awayPairId: "pair-8", winnerPairId: "pair-7" },
      { stage: "SEMIFINAL", homePairId: "pair-1", awayPairId: "pair-3", winnerPairId: "pair-1" },
      { stage: "SEMIFINAL", homePairId: "pair-5", awayPairId: "pair-7", winnerPairId: "pair-5" },
      { stage: "FINAL", homePairId: "pair-1", awayPairId: "pair-5", winnerPairId: "pair-1" },
    ],
  });
  const awards = buildPlacementAwards(stages, {
    CHAMPION: 500,
    RUNNER_UP: 300,
    SEMIFINAL: 180,
    QUARTERFINAL: 90,
    PARTICIPATION: 25,
  });

  assert.deepEqual(Object.fromEntries(awards), {
    "pair-1": 500,
    "pair-2": 90,
    "pair-3": 180,
    "pair-4": 90,
    "pair-5": 300,
    "pair-6": 90,
    "pair-7": 180,
    "pair-8": 90,
  });
});

test("league placements use standings order and never create knockout awards", () => {
  const stages = buildPlacementStages({
    format: "LEAGUE",
    pairIds: ["pair-1", "pair-2", "pair-3"],
    matches: [],
    leagueOrder: ["pair-2", "pair-1", "pair-3"],
  });

  assert.deepEqual(Object.fromEntries(stages), {
    "pair-1": "RUNNER_UP",
    "pair-2": "CHAMPION",
    "pair-3": "PARTICIPATION",
  });
});

test("ranking application is persisted once per category competition", async () => {
  const schema = await readFile(
    path.join(workspaceRoot, "prisma", "schema.prisma"),
    "utf8",
  );

  assert.match(schema, /model CategoryRankingApplication\b/);
  assert.match(schema, /competitionId\s+String\s+@unique/);
  assert.match(schema, /application\s+CategoryRankingApplication\?/);
});

test("ranking actions, form and read model preserve the selected ranking type", async () => {
  const [actions, form, service] = await Promise.all([
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
      path.join(workspaceRoot, "src", "lib", "services", "ranking.ts"),
      "utf8",
    ),
  ]);

  assert.match(actions, /type:\s*formData\.get\("type"\)/);
  assert.match(actions, /type:\s*parsed\.data\.type/);
  assert.match(form, /name="type"/);
  assert.match(form, /value="INDIVIDUAL"/);
  assert.match(form, /value="PAIR"/);
  assert.match(service, /type:\s*"INDIVIDUAL"\s*\|\s*"PAIR"/);
  assert.match(service, /pairLeaderboard/);
});

test("pair ranking screens render pair entries and category activity", async () => {
  const [listPage, detailPage, service] = await Promise.all([
    readFile(
      path.join(workspaceRoot, "src", "app", "(app)", "torneios", "rankings", "page.tsx"),
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
        "[rankingId]",
        "page.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(workspaceRoot, "src", "lib", "services", "ranking.ts"),
      "utf8",
    ),
  ]);

  assert.match(listPage, /ranking\.pairLeaderboard/);
  assert.match(detailPage, /ranking\.pairLeaderboard/);
  assert.match(service, /buildPairTournamentSummaries/);
  assert.match(service, /pairSourceEntries.*buildCycleSummaries/s);
});

test("legacy tournaments only accept individual rankings and the migration backfills their type", async () => {
  const [actions, migration] = await Promise.all([
    readFile(
      path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
      "utf8",
    ),
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

  assert.match(actions, /type:\s*"INDIVIDUAL"/);
  assert.match(actions, /linkedTournamentCount/);
  assert.match(migration, /UPDATE "RankingProfile"[\s\S]*SET "type" = 'INDIVIDUAL'/);
});

test("ranking profile writes are atomic and all ranking links share the same lock", async () => {
  const [actions, categoryService, tournamentService] = await Promise.all([
    readFile(
      path.join(workspaceRoot, "src", "lib", "actions", "tournament.ts"),
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
      path.join(workspaceRoot, "src", "lib", "services", "tournament.ts"),
      "utf8",
    ),
  ]);

  assert.match(actions, /runRankingSerializableTransaction/);
  assert.match(actions, /syncRankingRules\(\s*tx,/);
  assert.match(actions, /pg_advisory_xact_lock/);
  assert.match(categoryService, /pg_advisory_xact_lock/);
  assert.match(tournamentService, /pg_advisory_xact_lock/);
});

test("legacy tournament screens only offer individual rankings", async () => {
  const [newTournamentPage, tournamentDetailPage] = await Promise.all([
    readFile(
      path.join(workspaceRoot, "src", "app", "(app)", "torneios", "novo", "page.tsx"),
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
  ]);

  assert.match(newTournamentPage, /type:\s*"INDIVIDUAL"/);
  assert.match(tournamentDetailPage, /type:\s*"INDIVIDUAL"/);
});
