import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();

test("category workspace overview is a single compact summary", async () => {
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

  assert.equal(
    source.match(/className="league-overview-hero"/g)?.length,
    1,
    "the overview must render one category-overview summary",
  );
  for (const label of ["Duplas", "Jogos", "Ranking geral"]) {
    assert.ok(source.includes(label), `missing overview metric: ${label}`);
  }
  assert.doesNotMatch(source, /<CategoryCompetitionCard/);
});
