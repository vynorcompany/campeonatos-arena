import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("mobile dark portal keeps the green identity across its main surfaces", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const finance = read("src/components/public-finance-entry-list.tsx");
  const comandas = read("src/components/portal-client-comandas.tsx");
  const league = read("src/components/tournaments/public-league-portal.tsx");

  assert.match(portal, /tw:viewport-700:dark:\[background-image:linear-gradient\(165deg,#126c4d/);
  assert.match(portal, /tw:dark:\[background-image:radial-gradient\(circle_at_100%_0%,#2a9467/);
  assert.match(portal, /tw:viewport-700:dark:bg-\[#0d4c39\]/);
  for (const source of [portal, finance, comandas, league]) {
    assert.match(source, /tw:dark:border-\[#3e8b70\] tw:dark:bg-\[#104c3b\]/);
  }
});
