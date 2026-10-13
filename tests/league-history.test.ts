import assert from "node:assert/strict";
import test from "node:test";
import { historicalPairs, historicalStandings } from "../src/lib/league/history";

const snapshot = {
  pairs: [{ id: "a", name: "Dupla A" }, { id: "b", name: "Dupla B" }, { id: "c", name: "Dupla C" }, { id: "later", name: "Entrou depois" }],
  matches: [{ homePair: "Dupla A", awayPair: "Dupla B", winnerPair: "Dupla A", homeScore: 2, awayScore: 0 }],
};

test("historical ranking uses archived pairs and cycle match IDs", () => {
  const rows = historicalStandings(snapshot, [
    { homePairId: "a", awayPairId: "b", winnerPairId: "a", homeScore: 2, awayScore: 0 },
    { homePairId: "c", awayPairId: "b", winnerPairId: "c", homeScore: 2, awayScore: 1 },
  ]);
  assert.deepEqual(rows.map(({ pairName, victories, differential }) => ({ pairName, victories, differential })), [
    { pairName: "Dupla A", victories: 1, differential: 2 },
    { pairName: "Dupla C", victories: 1, differential: 1 },
    { pairName: "Dupla B", victories: 0, differential: -3 },
  ]);
  assert.equal(rows.some((row) => row.pairId === "later"), false);
});

test("legacy snapshots remain navigable without live matches", () => {
  const rows = historicalStandings(snapshot, []);
  assert.equal(rows[0].pairName, "Dupla A");
  assert.equal(rows[0].played, 1);
  assert.equal(rows[0].victories, 1);
});

test("missing or malformed snapshots do not fabricate results", () => {
  assert.deepEqual(historicalPairs(null), []);
  assert.deepEqual(historicalStandings({ pairs: [{ name: "No ID" }] }, []), []);
});
