import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

test("TV exposes the games slide toggle and persists its value", () => {
  assert.match(source("src/app/(app)/proximos-jogos/apresentacao/page.tsx"), /name="showMatches"/);
  assert.match(source("src/lib/actions/upcoming-match.ts"), /showMatches: formData\.get\("showMatches"\) === "on"/);
});

test("TV renders registered games only and sizes the grid by their count", () => {
  const tv = source("src/components/manual-upcoming-matches-tv.tsx");
  assert.match(tv, /tv-matches-count-\$\{Math\.min\(visibleMatches\.length, visibleMatchCount\)\}/);
  assert.doesNotMatch(tv, /tv-empty-slot|Aguardando cadastro/);
});
