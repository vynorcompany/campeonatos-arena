import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("jogos de Liga identificam visualmente mandante e visitante", () => {
  const adminGames = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-results-panel.tsx"), "utf8");
  const portalGames = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-league-portal.tsx"), "utf8");

  assert.match(adminGames, /Mandante/);
  assert.match(adminGames, /Visitante/);
  assert.match(portalGames, /Mandante/);
  assert.match(portalGames, /Visitante/);
});
