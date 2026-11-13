import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { parseLeagueMatchResultInput } from "../src/lib/actions/league-match-result-input";

function fixture(participant = true) {
  const writes: unknown[] = [];
  const refreshed: string[] = [];
  const exports: Record<string, (data: FormData) => Promise<any>> = {};
  const source = readFileSync(new URL("../src/lib/actions/league-challenges.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URLSearchParams,
    require(name: string) {
      if (name === "zod") return { z };
      if (name === "next/cache") return { revalidatePath: (path: string) => refreshed.push(path) };
      if (name.endsWith("league-match-result-input")) return { parseLeagueMatchResultInput };
      if (name.endsWith("auth/player-session")) return {
        requirePublicPlayerAuth: async () => ({ arenaId: "arena-a", playerId: "athlete-a" }),
        getPublicLinkedPlayerIds: async () => ["athlete-a"],
      };
      if (name.endsWith("services/public-player-link")) return { getPublicLinkedPlayerIds: async () => ["athlete-a"] };
      if (name.endsWith("arena-database")) return { arenaDatabase: () => ({ categoryMatch: { findFirst: async () => ({
        id: "match-a", homePair: { players: [{ playerId: participant ? "athlete-a" : "other" }] },
        awayPair: { players: [{ playerId: "athlete-b" }] }, competition: { categoryId: "category-a" },
      }) } }) };
      if (name.endsWith("services/category-competition")) return { recordCategoryLeagueMatchResult: async (...args: unknown[]) => {
        writes.push(args); return { id: "match-a", homeScore: 2, awayScore: 0 };
      } };
      if (name.endsWith("public-portal-url")) return { publicPortalPath: () => "/home?arena=arena-a" };
      return {};
    },
  });
  return { save: exports.recordOwnLeagueMatchResultAction, writes, refreshed };
}

function score() {
  const data = new FormData();
  Object.entries({ arenaSlug: "arena-a", matchId: "match-a", homeSet1: "6", awaySet1: "4", homeSet2: "6", awaySet2: "3" }).forEach(([key, value]) => data.set(key, value));
  return data;
}

test("portal confirms the persisted match and refreshes management results", async () => {
  const f = fixture();
  const result = await f.save(score());
  assert.equal(result.success, true);
  assert.equal(result.matchId, "match-a");
  assert.equal(result.homeScore, 2);
  assert.equal(f.writes.length, 1);
  assert.ok(f.refreshed.includes("/torneios"));
  assert.deepEqual(JSON.parse(JSON.stringify((f.writes[0] as any[])[2].playerIds)), ["athlete-b"]);
});

test("invalid sets return actionable feedback without writing a match", async () => {
  const f = fixture();
  const data = score();
  data.set("awaySet1", "6");
  const result = await f.save(data);
  assert.equal(result.success, false);
  assert.match(result.error, /sem empate/);
  assert.equal(f.writes.length, 0);
});

test("a player outside the home pair cannot register the result", async () => {
  const f = fixture(false);
  const result = await f.save(score());
  assert.equal(result.success, false);
  assert.match(result.error, /Somente a dupla mandante/);
  assert.equal(f.writes.length, 0);
  assert.equal(f.refreshed.length, 0);
});
