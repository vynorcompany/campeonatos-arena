import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("tela, reabertura e premiação usam o mesmo mês da arena", () => {
  const page = readFileSync(new URL("../src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../src/lib/actions/category-competition.ts", import.meta.url), "utf8");
  const service = readFileSync(new URL("../src/lib/services/category-competition.ts", import.meta.url), "utf8");
  assert.match(page, /const currentReferenceMonth = leagueReferenceMonth\(new Date\(\)\)/);
  assert.equal((page.match(/cycle\.referenceMonth === currentReferenceMonth/g) ?? []).length, 1);
  assert.match(page, /leagueCycles\[0\]\?\.referenceMonth === currentReferenceMonth/);
  assert.match(actions, /const referenceMonth = leagueReferenceMonth\(new Date\(\)\)/);
  assert.match(service, /const referenceMonth = leagueReferenceMonth\(new Date\(\)\)/);
  assert.match(service, /getLeagueMonthBlocks\(referenceYear, referenceMonthNumber\)/);
  assert.doesNotMatch(page, /toISOString\(\)\.slice\(0, 7\)/);
});
