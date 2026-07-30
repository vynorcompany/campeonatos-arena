import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workspaceRoot = process.cwd();

test("results show Liga sports standings without ranking points", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "components",
      "tournaments",
      "category-results-panel.tsx",
    ),
    "utf8",
  );

  for (const header of ["Jogos", "Vitórias", "Derrotas", "Saldo"]) {
    assert.ok(source.includes(`<th>${header}</th>`), `missing ${header} header`);
  }

  assert.doesNotMatch(source, /totalPoints/);
  assert.doesNotMatch(source, /\bpts\b/);
});

test("category route derives display standings with the shared ranking rule", async () => {
  const source = await readFile(
    path.join(
      workspaceRoot,
      "src",
      "app",
      "(app)",
      "torneios",
      "[tournamentId]",
      "categorias",
      "[categoryId]",
      "page.tsx",
    ),
    "utf8",
  );

  assert.match(source, /import\s*\{\s*rankStandings\s*\}/);
  assert.match(source, /leagueStandings/);
  assert.match(source, /knockoutPlacement/);
  assert.match(source, /sportsResults/);
});
