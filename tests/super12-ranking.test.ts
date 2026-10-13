import assert from "node:assert/strict";
import test from "node:test";
import { compareSuper12CrossGroupPairs, compareSuper12GroupPairs } from "../src/lib/super12/ranking";

test("mata-mata e tabela priorizam confronto direto depois de vitórias e saldo", () => {
  const pairs = [
    { id: "a", name: "Dupla A", wins: 2, saldo: 3, pointsFor: 21 },
    { id: "b", name: "Dupla B", wins: 2, saldo: 3, pointsFor: 18 },
  ];
  const matches = [{ homePairId: "a", awayPairId: "b", homeScore: 4, awayScore: 6 }];
  assert.deepEqual([...pairs].sort((left, right) => compareSuper12GroupPairs(left, right, matches)).map((pair) => pair.id), ["b", "a"]);
});

test("duplas de grupos diferentes não usam confronto direto e ficam em ordem estável", () => {
  const pairs = [
    { id: "b", name: "Dupla B", wins: 1, saldo: 2, pointsFor: 12 },
    { id: "a", name: "Dupla A", wins: 1, saldo: 2, pointsFor: 12 },
  ];
  assert.deepEqual([...pairs].sort(compareSuper12CrossGroupPairs).map((pair) => pair.id), ["a", "b"]);
});
