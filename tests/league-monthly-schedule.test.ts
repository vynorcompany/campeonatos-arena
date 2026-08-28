import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildMonthlyLeagueSchedule, getLeagueMonthBlocks } from "@/lib/league/monthly-schedule";

test("Liga divides its monthly calendar into the four fixed blocks", () => {
  assert.deepEqual(getLeagueMonthBlocks(2026, 2), [
    { number: 1, startsOn: "2026-02-01", endsOn: "2026-02-07" },
    { number: 2, startsOn: "2026-02-08", endsOn: "2026-02-14" },
    { number: 3, startsOn: "2026-02-15", endsOn: "2026-02-21" },
    { number: 4, startsOn: "2026-02-22", endsOn: "2026-02-28" },
  ]);
});

test("Liga distributes round-robin matches and home responsibilities fairly across four blocks", () => {
  const schedule = buildMonthlyLeagueSchedule(["A", "B", "C", "D", "E", "F"]);
  const homeGames = new Map<string, number>();
  for (const match of schedule.matches) homeGames.set(match.homePairId, (homeGames.get(match.homePairId) ?? 0) + 1);

  assert.equal(schedule.matches.length, 15);
  assert.deepEqual(schedule.blockCounts, [4, 4, 4, 3]);
  assert.ok(Math.max(...homeGames.values()) - Math.min(...homeGames.values()) <= 1);
  assert.deepEqual(new Set(schedule.matches.map((match) => match.blockNumber)), new Set([1, 2, 3, 4]));
});

test("Liga keeps home duties balanced with an odd number of pairs", () => {
  const schedule = buildMonthlyLeagueSchedule(["A", "B", "C", "D", "E"]);
  const homes = new Map<string, number>();
  for (const match of schedule.matches) homes.set(match.homePairId, (homes.get(match.homePairId) ?? 0) + 1);
  assert.equal(schedule.matches.length, 10);
  assert.ok(Math.max(...homes.values()) - Math.min(...homes.values()) <= 1);
});

test("schema keeps monthly League cycles, proposals and medical substitution requests isolated", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  assert.match(schema, /model LeagueCycle/);
  assert.match(schema, /model LeagueMatchProposal/);
  assert.match(schema, /model LeagueMedicalSubstitutionRequest/);
  assert.match(schema, /leagueCycleId\s+String\?/);
  assert.match(schema, /leagueBlock\s+Int\?/);
});

test("publishing a Liga uses the monthly schedule engine and persists its cycle", () => {
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/category-competition.ts"), "utf8");

  assert.match(service, /buildMonthlyLeagueSchedule/);
  assert.match(service, /leagueCycle\.upsert/);
  assert.match(service, /leagueBlock:/);
});

test("league proposals enforce host ownership, three attempts and response deadlines", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/league-challenges.ts"), "utf8");

  assert.match(actions, /homePairId !== proposer\.id/);
  assert.match(actions, /proposalCount >= 3/);
  assert.match(actions, /leagueMatchProposal/);
  assert.match(actions, /responseDueAt/);
});

test("monthly closing resolves deadlines, W.O. and opens the next cycle", () => {
  const lifecycle = readFileSync(resolve(process.cwd(), "src/lib/league/lifecycle.ts"), "utf8");
  assert.match(lifecycle, /HOST_NO_PROPOSAL/);
  assert.match(lifecycle, /VISITOR_NO_RESPONSE/);
  assert.match(lifecycle, /DOUBLE_WO/);
  assert.match(lifecycle, /createMonthlyCycle/);
  assert.match(lifecycle, /applyPromotionAndRelegation/);
});

test("arena can process the League lifecycle manually without a cron", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/category-competition.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");
  assert.match(actions, /runLeagueLifecycleAction/);
  assert.match(actions, /closeExpiredLeagueCycles/);
  assert.match(page, /Processar ciclo da Liga/);
});

test("athlete portal exposes the main modules and League submenus", () => {
  const view = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  assert.match(view, /Portal do Atleta/);
  assert.match(view, /Grade de horários/);
  assert.match(view, /Minhas reservas/);
  assert.match(view, /Premiação/);
  assert.match(view, /portal-league-prize-podium/);
});
