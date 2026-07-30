import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGroups,
  buildKnockout,
  buildRoundRobin,
} from "../src/lib/tournament-category/draw";
import {
  rankStandings,
  selectQuarterfinalists,
} from "../src/lib/tournament-category/standings";

const pairIds = (count: number) =>
  Array.from({ length: count }, (_, index) => `pair-${index + 1}`);

test("Simple distributes fourteen pairs into balanced groups of three and four", () => {
  const groups = buildGroups({ format: "SIMPLE", pairIds: pairIds(14) });

  assert.deepEqual(
    groups.map((group) => group.pairIds.length),
    [4, 4, 3, 3],
  );
  assert.ok(groups.every((group) => group.pairIds.length === 3 || group.pairIds.length === 4));
  assert.ok(
    Math.max(...groups.map((group) => group.pairIds.length)) -
      Math.min(...groups.map((group) => group.pairIds.length)) <=
      1,
  );
});

test("fixed group formats create exactly their configured number of groups", () => {
  assert.equal(buildGroups({ format: "THREE_GROUPS", pairIds: pairIds(12) }).length, 3);
  assert.equal(buildGroups({ format: "FOUR_GROUPS", pairIds: pairIds(12) }).length, 4);
});

test("non-league formats reject draws with fewer than eight pairs", () => {
  assert.throws(
    () => buildGroups({ format: "SIMPLE", pairIds: pairIds(7) }),
    /at least eight pairs/i,
  );
  assert.doesNotThrow(() => buildGroups({ format: "LEAGUE", pairIds: pairIds(2) }));
});

test("round robin schedules every unique pair matchup once", () => {
  assert.deepEqual(buildRoundRobin(["a", "b", "c"]), [
    { homePairId: "a", awayPairId: "b" },
    { homePairId: "a", awayPairId: "c" },
    { homePairId: "b", awayPairId: "c" },
  ]);
});

test("standings prioritize victories before head-to-head and differential", () => {
  const victoryFirst = rankStandings(
    [
      { pairId: "more-wins", victories: 3, differential: -10 },
      { pairId: "fewer-wins", victories: 2, differential: 99 },
    ],
    [],
  );
  const ranked = rankStandings(
    [
      { pairId: "a", victories: 2, differential: 3 },
      { pairId: "b", victories: 2, differential: 12 },
    ],
    [{ homePairId: "a", awayPairId: "b", homeScore: 6, awayScore: 4 }],
  );
  const differentialFallback = rankStandings(
    [
      { pairId: "higher-differential", victories: 2, differential: 5 },
      { pairId: "lower-differential", victories: 2, differential: 1 },
    ],
    [],
  );

  assert.deepEqual(victoryFirst.map((row) => row.pairId), ["more-wins", "fewer-wins"]);
  assert.deepEqual(
    ranked.map((row) => row.pairId),
    ["a", "b"],
  );
  assert.deepEqual(differentialFallback.map((row) => row.pairId), [
    "higher-differential",
    "lower-differential",
  ]);
});

test("three groups qualify the top two and the two best third places", () => {
  const qualified = selectQuarterfinalists([
    {
      rows: [
        { pairId: "a1", victories: 3, differential: 8 },
        { pairId: "a2", victories: 2, differential: 4 },
        { pairId: "a3", victories: 1, differential: 1 },
      ],
      matches: [],
    },
    {
      rows: [
        { pairId: "b1", victories: 3, differential: 7 },
        { pairId: "b2", victories: 2, differential: 3 },
        { pairId: "b3", victories: 1, differential: 2 },
      ],
      matches: [],
    },
    {
      rows: [
        { pairId: "c1", victories: 3, differential: 6 },
        { pairId: "c2", victories: 2, differential: 2 },
        { pairId: "c3", victories: 1, differential: 0 },
      ],
      matches: [],
    },
  ]);

  assert.deepEqual(qualified, ["a1", "a2", "b1", "b2", "c1", "c2", "b3", "a3"]);
});

test("league produces no knockout while other formats create quarterfinals through the final", () => {
  assert.deepEqual(buildKnockout("LEAGUE", pairIds(8)), []);

  const knockout = buildKnockout("SIMPLE", pairIds(8));
  assert.deepEqual(
    knockout.map((match) => match.stage),
    [
      "QUARTERFINAL",
      "QUARTERFINAL",
      "QUARTERFINAL",
      "QUARTERFINAL",
      "SEMIFINAL",
      "SEMIFINAL",
      "FINAL",
    ],
  );
  assert.equal(knockout.filter((match) => match.stage === "QUARTERFINAL").length, 4);
  assert.equal(knockout.filter((match) => match.stage === "SEMIFINAL").length, 2);
  assert.equal(knockout.filter((match) => match.stage === "FINAL").length, 1);
});
