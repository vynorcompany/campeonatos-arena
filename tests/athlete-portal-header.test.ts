import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("athlete portal exposes logout in arena and global headers", () => {
  const arena = read("src/components/tournaments/public-standings.tsx");
  const global = read("src/app/portal/page.tsx");
  const actions = read("src/lib/actions/player-auth.ts");

  assert.match(arena, /action=\{logoutAthletePortalAction\}/);
  assert.match(arena, /name="arenaSlug" value=\{arena\.slug\}/);
  assert.match(global, /action=\{logoutAthletePortalAction\}/);
  assert.match(actions, /export async function logoutAthletePortalAction/);
  assert.match(actions, /await destroyPublicPlayerSession\(\)/);
  assert.match(actions, /redirect\(arenaSlug\.success \? `\/classificacao\/\$\{encodeURIComponent\(arenaSlug\.data\)\}` : "\/portal"\)/);
});

test("portal title is an accessible vector wordmark", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const mark = read("src/components/athlete-portal-wordmark.tsx");

  assert.match(portal, /<h1 className="sr-only">Portal do Atleta<\/h1>/);
  assert.match(portal, /<AthletePortalWordmark \/>/);
  assert.match(mark, /<svg[^>]*role="img" aria-label="Portal do Atleta"/);
});
