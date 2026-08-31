import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("authenticated public portal exposes league challenges scoped to the player pair", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const standings = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/classificacao/[arenaSlug]/page.tsx"), "utf8");

  assert.match(schema, /model LeagueChallenge/);
  assert.match(schema, /model PlayerNotification/);
  assert.match(schema, /challengeId\s+String\?\s+@unique/);
  assert.match(standings, /PublicLeaguePortal/);
  assert.match(page, /getPublicPlayerAuth/);
  assert.ok(existsSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx")));
});

test("league challenges validate category or group eligibility and reserve a pending game after acceptance", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/league-challenges.ts"), "utf8");

  assert.match(actions, /createLeagueChallengeAction/);
  assert.match(actions, /respondLeagueChallengeAction/);
  assert.match(actions, /same group|mesmo grupo/i);
  assert.match(actions, /PENDING_CONFIRMATION/);
  assert.match(actions, /playerNotification\.createMany/);
  assert.match(actions, /scheduleOccurrence\.create/);
  assert.match(actions, /arenaNotification\.create/);
});
