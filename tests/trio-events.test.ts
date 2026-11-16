import assert from "node:assert/strict";
import test from "node:test";
import { summarizeTrioGames, validateTrioGame, trioFormationKey, type TrioGameResult } from "../src/lib/tournament-category/trio";
import { validateRegistrationThird } from "../src/lib/tournaments/trio-registration";

const a = ["a", "b", "c"], b = ["d", "e", "f"];
const first: TrioGameResult = { gameNumber: 1, homePlayerIds: ["a", "b"], awayPlayerIds: ["d", "e"], homeScore: 6, awayScore: 3 };
const second: TrioGameResult = { gameNumber: 2, homePlayerIds: ["a", "c"], awayPlayerIds: ["d", "f"], homeScore: 3, awayScore: 6 };
const third: TrioGameResult = { gameNumber: 3, homePlayerIds: ["b", "c"], awayPlayerIds: ["e", "f"], homeScore: 6, awayScore: 2 };

test("Trio uses three distinct formations, not ordered names or sets", () => {
  assert.equal(trioFormationKey(["a", "b"]), trioFormationKey(["b", "a"]));
  assert.throws(() => validateTrioGame({ ...second, homePlayerIds: ["b", "a"] }, a, b, [first]), /mandante/);
  assert.throws(() => validateTrioGame({ ...second, awayPlayerIds: ["e", "d"] }, a, b, [first]), /visitante/);
  assert.throws(() => validateTrioGame({ ...second, homePlayerIds: ["a", "x"] }, a, b, [first]), /dois atletas/);
  assert.throws(() => validateTrioGame({ ...second, homePlayerIds: ["a", "a"] }, a, b, [first]), /dois atletas/);
  assert.equal(validateTrioGame(first, a, b, []).length, 1, "Each new encounter starts with no formations used.");
});

test("Trio requires both initial games and enables only the necessary decider", () => {
  assert.equal(summarizeTrioGames([first]).finished, false);
  assert.throws(() => validateTrioGame(second, a, b, []), /ordem/);
  assert.throws(() => validateTrioGame(third, a, b, [first]), /ordem/);
  const tied = validateTrioGame(second, a, b, [first]);
  assert.deepEqual(summarizeTrioGames(tied), { homeWins: 1, awayWins: 1, finished: false, needsDecider: true });
  assert.deepEqual(summarizeTrioGames(validateTrioGame(third, a, b, tied)), { homeWins: 2, awayWins: 1, finished: true, needsDecider: false });
  const sweep = [first, { ...second, homeScore: 6, awayScore: 1 }];
  assert.deepEqual(summarizeTrioGames(sweep), { homeWins: 2, awayWins: 0, finished: true, needsDecider: false });
  assert.throws(() => validateTrioGame(third, a, b, sweep), /1 a 1/);
  assert.throws(() => validateTrioGame({ ...first, homeScore: 1 }, a, b, [first, second, third]), /1 a 1/, "A correction cannot invalidate an already recorded decider.");
  assert.throws(() => validateTrioGame({ ...first, homeScore: 3 }, a, b, []), /placar/);
});

test("Third-athlete registration is required only for Trio and uses a distinct identity", () => {
  const input = { leadCpf: "11111111111", partnerCpf: "22222222222", thirdName: "Terceiro Atleta", thirdPhone: "41999998888", thirdCpf: "33333333333" };
  assert.doesNotThrow(() => validateRegistrationThird("TRIO", input));
  assert.throws(() => validateRegistrationThird("TRIO", { ...input, thirdCpf: input.leadCpf }), /CPFs diferentes/);
  assert.throws(() => validateRegistrationThird("TRIO", { ...input, thirdName: "Atleta" }), /nome completo/);
  assert.throws(() => validateRegistrationThird("SIMPLE", input), /dois atletas/);
  assert.doesNotThrow(() => validateRegistrationThird("SIMPLE", { leadCpf: input.leadCpf, partnerCpf: input.partnerCpf }));
});
