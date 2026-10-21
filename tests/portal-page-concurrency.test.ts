import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/classificacao/[arenaSlug]/page.tsx", import.meta.url), "utf8");

test("portal starts independent tenant-scoped reads before awaiting their results", () => {
  assert.match(source, /const \[data, \{ currentClient, athleteIdentity \}\] = await Promise\.all\(\[/);
  assert.match(source, /getPublicPlayerContext\(params\.arenaSlug\)/);
  assert.match(source, /const \[portal, home, finance, comandas, radar, super12, notifications\] = currentClient \? await Promise\.all\(\[/);
  assert.doesNotMatch(source, /\? await getArenaPublicStandings\(/);
  assert.doesNotMatch(source, /\? await getPublic(?:LeaguePortal|ClientHome|ClientFinance|ClientComandas|DoublesRadar|Super12)\(/);
  assert.match(source, /getAthletePortalNotifications\(params\.arenaSlug, currentClient\.playerId\)/);
});
