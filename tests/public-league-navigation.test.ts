import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("the athlete portal preserves the Ligas section requested by its navigation link", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/classificacao/[arenaSlug]/page.tsx"), "utf8");
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(portal, /portalHref\("leagues", "games"\)/);
  assert.match(page, /searchParams\?\.section === "leagues"/);
});
