import assert from "node:assert/strict";
import test from "node:test";
import { leagueReferenceMonth } from "../src/lib/league/reference-month";

test("o mês da Liga segue São Paulo, não o UTC do servidor", () => {
  assert.equal(leagueReferenceMonth(new Date("2026-11-01T02:59:59Z")), "2026-10");
  assert.equal(leagueReferenceMonth(new Date("2026-11-01T03:00:00Z")), "2026-11");
});

test("a virada do ano mantém o ciclo de dezembro até meia-noite na arena", () => {
  assert.equal(leagueReferenceMonth(new Date("2027-01-01T02:59:59Z")), "2026-12");
  assert.equal(leagueReferenceMonth(new Date("2027-01-01T03:00:00Z")), "2027-01");
});
