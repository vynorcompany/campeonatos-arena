import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertMatchCanBeCorrected,
  buildReopenedMatch,
} from "../src/lib/tournament-category/match-status";
import {
  updateCategoryMatchStatusSchema,
} from "../src/lib/validators/category-competition";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("reopening a league match preserves its score and clears its winner", () => {
  const next = buildReopenedMatch(
    { homeScore: 6, awayScore: 4, winnerPairId: "pair-a" },
    "LIVE",
  );

  assert.deepEqual(next, {
    homeScore: 6,
    awayScore: 4,
    winnerPairId: null,
    manualStatus: "LIVE",
  });
});

test("blocks knockout corrections after the winner occupies a later round", () => {
  assert.throws(
    () =>
      assertMatchCanBeCorrected({
        stage: "QUARTERFINAL",
        winnerPairId: "pair-a",
        hasDownstreamParticipant: true,
      }),
    /próxima fase/i,
  );
});

test("accepts only the three supported match statuses", () => {
  assert.equal(
    updateCategoryMatchStatusSchema.safeParse({
      matchId: "match-1",
      status: "LIVE",
    }).success,
    true,
  );
  assert.equal(
    updateCategoryMatchStatusSchema.safeParse({
      matchId: "match-1",
      status: "CANCELLED",
    }).success,
    false,
  );
});

test("status updates use published competition and arena ownership constraints", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "src", "lib", "services", "category-competition.ts"),
    "utf8",
  );
  const statusUpdateSource = source.slice(
    source.indexOf("export async function updateCategoryMatchStatus"),
    source.indexOf("export async function recordCategoryMatchResult"),
  );

  assert.match(statusUpdateSource, /status:\s*categoryCompetitionStatus\.PUBLISHED/);
  assert.match(statusUpdateSource, /tournament:\s*\{\s*arenaId\s*\}/);
  assert.match(statusUpdateSource, /runSerializableTransaction/);
});

test("status updates retain scores while reopening and finish only with a winner", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "src", "lib", "services", "category-competition.ts"),
    "utf8",
  );
  const statusUpdateSource = source.slice(
    source.indexOf("export async function updateCategoryMatchStatus"),
    source.indexOf("export async function recordCategoryMatchResult"),
  );

  assert.match(statusUpdateSource, /Informe um placar vencedor antes de finalizar o jogo/);
  assert.match(statusUpdateSource, /buildReopenedMatch\(match, status\)/);
  assert.match(statusUpdateSource, /manualStatus:\s*"FINISHED"/);
  assert.match(statusUpdateSource, /advanceKnockoutWinner/);
});

test("reopening a completed group match invalidates its derived knockout bracket", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "src", "lib", "services", "category-competition.ts"),
    "utf8",
  );
  const statusUpdateSource = source.slice(
    source.indexOf("export async function updateCategoryMatchStatus"),
    source.indexOf("export async function recordCategoryMatchResult"),
  );
  const invalidationSource = source.slice(
    source.indexOf("async function invalidateKnockoutBracket"),
    source.indexOf("async function resetKnockoutFromStandings"),
  );

  assert.match(
    statusUpdateSource,
    /match\.stage === categoryMatchStage\.GROUP && match\.winnerPairId/,
  );
  assert.match(
    statusUpdateSource,
    /invalidateKnockoutBracket\(tx, match\.competitionId\)/,
  );
  assert.match(invalidationSource, /stage:\s*\{\s*not:\s*categoryMatchStage\.GROUP\s*\}/);
  assert.match(invalidationSource, /homePairId:\s*null/);
  assert.match(invalidationSource, /awayPairId:\s*null/);
  assert.match(invalidationSource, /homeScore:\s*null/);
  assert.match(invalidationSource, /awayScore:\s*null/);
  assert.match(invalidationSource, /winnerPairId:\s*null/);
  assert.match(invalidationSource, /manualStatus:\s*"SCHEDULED"/);
});

test("recording a result marks the match as finished and guards downstream knockout changes", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "src", "lib", "services", "category-competition.ts"),
    "utf8",
  );
  const resultSource = source.slice(
    source.indexOf("export async function recordCategoryMatchResult"),
    source.indexOf("export async function finishCategoryCompetition"),
  );

  assert.match(resultSource, /manualStatus:\s*"FINISHED"/);
  assert.match(resultSource, /assertStoredMatchCanBeCorrected/);
  assert.match(resultSource, /homeScore === awayScore/);
});

test("liga permite resetar um resultado apagando sets, placar e vencedora", async () => {
  const service = await readFile(
    path.join(workspaceRoot, "src", "lib", "services", "category-competition.ts"),
    "utf8",
  );
  const action = await readFile(
    path.join(workspaceRoot, "src", "lib", "actions", "category-competition.ts"),
    "utf8",
  );
  const panel = await readFile(
    path.join(workspaceRoot, "src", "components", "tournaments", "category-results-panel.tsx"),
    "utf8",
  );

  assert.match(service, /export async function resetCategoryLeagueMatchResult/);
  assert.match(service, /format:\s*"LEAGUE"/);
  assert.match(service, /homeSet1:\s*null/);
  assert.match(service, /awaySet3:\s*null/);
  assert.match(service, /winnerPairId:\s*null/);
  assert.match(action, /resetCategoryLeagueMatchResultAction/);
  assert.match(panel, /Resetar resultado/);
});
