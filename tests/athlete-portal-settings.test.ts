import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("a arena controla quais menus aparecem no Portal do Atleta", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const action = readFileSync(resolve(process.cwd(), "src/lib/actions/arena.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/arena/page.tsx"), "utf8");
  const standings = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(schema, /athletePortalShowBooking\s+Boolean\s+@default\(true\)/);
  assert.match(schema, /athletePortalShowLessons\s+Boolean\s+@default\(true\)/);
  assert.match(action, /updateAthletePortalSettingsAction/);
  assert.match(page, /Portal do Atleta/);
  assert.match(standings, /athletePortalShowBooking/);
});

test("Duplas não repete os atletas e regras não repete o nome da Liga", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");
  const standings = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.doesNotMatch(portal, /pair\.players\.map\(\(player\) => player\.name\)\.join/);
  assert.match(standings, /<strong>\{league\.categoryName\}<\/strong>/);
});
