import assert from "node:assert/strict";
import test from "node:test";
import { orderGroupPairsByStandings, groupDisplayStandings } from "../src/lib/tournament-category/group-display-order";
const pairs = ["a", "b", "c", "d"].map(id => ({ id, name: id.toUpperCase() }));
const game = (homePairId: string, awayPairId: string, homeScore: number, awayScore: number) => ({ stage: "GROUP", homePairId, awayPairId, homeScore, awayScore, winnerPairId: homeScore > awayScore ? homePairId : awayPairId });

test("groups show the current leaders first and preserve the established head-to-head tiebreak", () => {
  const matches = [game("a", "b", 6, 4), game("a", "c", 0, 6), game("b", "d", 6, 0), game("c", "d", 6, 0)];
  assert.deepEqual(orderGroupPairsByStandings(pairs, matches).map(pair => pair.id), ["c", "a", "b", "d"]);
});
test("a three-way tie uses the existing differential criterion", () => {
  const matches = [game("a", "b", 6, 0), game("b", "c", 6, 4), game("c", "a", 6, 4)];
  assert.deepEqual(orderGroupPairsByStandings(pairs.slice(0, 3), matches).map(pair => pair.id), ["a", "c", "b"]);
});
test("partial Trio encounters, knockout matches and other groups do not award group victories", () => {
  const matches = [game("b", "a", 6, 2), { ...game("a", "c", 1, 0), winnerPairId: null }, { ...game("a", "c", 6, 0), stage: "FINAL" }, game("a", "foreign", 6, 0)];
  assert.deepEqual(orderGroupPairsByStandings(pairs.slice(0, 3), matches).map(pair => pair.id), ["b", "c", "a"]);
});
test("presentation ordering never mutates the draw or initial seed order", () => {
  const frozen = Object.freeze([...pairs].reverse());
  assert.deepEqual(orderGroupPairsByStandings(frozen, []), frozen);
  const snapshot = JSON.stringify(frozen);
  const ordered = orderGroupPairsByStandings(frozen, [game("a", "d", 6, 2)]);
  assert.equal(ordered[0].id, "a");
  assert.equal(JSON.stringify(frozen), snapshot);
  assert.notEqual(ordered, frozen);
});

test("partial results show matches, victories, losses and differential before the final", () => {
  const rows = groupDisplayStandings(pairs.slice(0, 3), [game("c", "a", 6, 2), game("c", "b", 6, 3), game("b", "a", 6, 4)]);
  assert.deepEqual(rows.map(({pairId,matches,victories,losses,differential}) => ({pairId,matches,victories,losses,differential})), [
    {pairId:"c",matches:2,victories:2,losses:0,differential:7},
    {pairId:"b",matches:2,victories:1,losses:1,differential:-1},
    {pairId:"a",matches:2,victories:0,losses:2,differential:-6},
  ]);
});
