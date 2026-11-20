import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

function fixture(fail = false) {
  const writes: any[][] = [], refreshed: string[] = [];
  const exports: Record<string, (data: FormData) => Promise<any>> = {};
  const source = readFileSync(new URL("../src/lib/actions/public-event-results.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Object, Error,
    require(name: string) {
      if (name === "zod") return { z };
      if (name === "next/cache") return { revalidatePath: (path: string) => refreshed.push(path) };
      if (name.endsWith("auth/player-session")) return { requirePublicPlayerAuth: async () => ({ arenaId: "arena-a", playerId: "athlete-a" }) };
      if (name.endsWith("services/public-player-link")) return { getPublicLinkedPlayerIds: async () => ["athlete-a", "legacy-a"] };
      if (name.endsWith("services/category-competition/matches")) return { recordCategoryMatchResult: async (...args: any[]) => { if (fail) throw new Error("SQL private failure"); writes.push(args); return true; } };
      if (name.endsWith("services/category-trio")) return { recordCategoryTrioGame: async (...args: any[]) => { writes.push(args); return { homeWins: 1, awayWins: 0 }; } };
      if (name.endsWith("services/portal-match-result-access")) return { portalResultError: () => "Não foi possível salvar o resultado." };
      throw new Error("Unexpected dependency " + name);
    },
  });
  return { save: exports.recordOwnEventMatchResultAction, trio: exports.recordOwnTrioGameResultAction, writes, refreshed };
}
const data = () => {
  const result = new FormData();
  Object.entries({ arenaSlug: "arena-a", matchId: "match-a", homeScore: "6", awayScore: "3" }).forEach(([key, value]) => result.set(key, value));
  return result;
};
test("event result uses the session arena and linked players, confirms scores and refreshes views", async () => {
  const f = fixture(), form = data(); form.set("arenaId", "foreign"); form.set("playerId", "foreign");
  assert.equal((await f.save(form)).success, true);
  assert.equal(f.writes[0][0], "arena-a");
  assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0][4])), { playerId: "athlete-a", playerIds: ["athlete-a", "legacy-a"] });
  assert.ok(f.refreshed.includes("/home")); assert.ok(f.refreshed.includes("/torneios"));
});
test("blank, negative, decimal, tied and oversized scores cannot reach persistence", async () => {
  for (const score of ["", " ", "-1", "1.5", "100", "3"]) {
    const f = fixture(), form = data(); form.set("homeScore", score);
    assert.equal((await f.save(form)).success, false, score); assert.equal(f.writes.length, 0);
  }
});
test("Trio action preserves both formations as arrays and forwards participant restrictions", async () => {
  const f = fixture(), form = data(); form.set("gameNumber", "2");
  ["h1", "h2"].forEach(id => form.append("homePlayerIds", id)); ["a1", "a2"].forEach(id => form.append("awayPlayerIds", id));
  const saved = await f.trio(form); assert.equal(saved.success, true); assert.equal(saved.homeScore, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(f.writes[0][2].homePlayerIds)), ["h1", "h2"]);
  assert.equal(f.writes[0][4].playerId, "athlete-a");
  form.delete("awayPlayerIds"); assert.equal((await f.trio(form)).success, false); assert.equal(f.writes.length, 1);
});
test("unexpected storage errors return safe visible feedback without announcing success", async () => {
  const f = fixture(true), saved = await f.save(data());
  assert.equal(saved.success, false); assert.doesNotMatch(saved.error, /SQL|private/); assert.equal(f.refreshed.length, 0);
});
