import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("Portal do Atleta oferece Duplas e consulta categorias de Liga", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/classificacao/[arenaSlug]/page.tsx"), "utf8");
  const standings = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-league-portal.ts"), "utf8");

  assert.match(page, /leagueCategory/);
  assert.match(standings, /\"pairs\"/);
  assert.match(standings, />Duplas</);
  assert.match(portal, /leagueCategories/);
  assert.match(portal, /selectedLeaguePairs/);
  assert.match(portal, /leagueResults/);
  assert.match(portal, /portal-league-match-schedule/);
  assert.match(portal, /result\.scheduledAtLabel \? "Agendado" : "Aguardando"/);
  assert.match(service, /const leagueCategories/);
  assert.match(service, /const selectedLeaguePairs/);
  assert.match(service, /const leagueResults/);
  assert.match(service, /scheduledDate: match\.scheduledDate/);
  assert.match(service, /scheduledTime: match\.scheduledTime/);
});
