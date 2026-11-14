import { readFile } from "./helpers/style-source";
import assert from "node:assert/strict";
import test from "node:test";

import path from "node:path";

const workspaceRoot = process.cwd();

test("category overview keeps the roster visible and puts configuration behind disclosure", async () => {
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
    source.match(/(?:className="league-overview-hero"|className=\{(?:cx\()?viewStyles\.league_overview_hero(?:\))?\})/g)?.length,
    1,
    "the overview must render one category-overview summary",
  );
  assert.match(source, /<CategoryOverviewRoster/);
  assert.match(source, /counts=\{\{ registrations: competition\?\.pairs\.length/);
  assert.match(source, /<details[^>]*>[\s\S]*?<summary[^>]*>Configurações da categoria<\/summary>/);
  assert.doesNotMatch(source, /className=\{viewStyles\.league_overview_metric\}/);
  assert.doesNotMatch(source, /<CategoryCompetitionCard/);
});
