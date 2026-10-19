import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

function source(path: string) { return readFileSync(resolve(process.cwd(), path), "utf8"); }

test("TV exposes the games slide toggle and persists its value", () => {
  assert.match(source("src/app/(app)/proximos-jogos/apresentacao/page.tsx"), /name="showMatches"/);
  assert.match(source("src/lib/actions/upcoming-match.ts"), /showMatches: formData\.get\("showMatches"\) === "on"/);
});

test("TV renders registered games only and sizes the grid by their count", () => {
  const tv = source("src/components/manual-upcoming-matches-tv.tsx");
  const styles = source("src/components/manual-upcoming-matches-tv.utilities.ts");
  assert.match(tv, /tv-matches-count-\$\{Math\.min\(visibleMatches\.length, visibleMatchCount\)\}/);
  assert.match(tv, /visibleMatches\.length === 1 \? "tw:max-w-\[840px\] tw:mx-auto"/);
  assert.match(tv, /visibleMatches\.length > 1 && visibleMatches\.length % 2 === 1/);
  assert.match(styles, /"tv-matches-grid", "tw:grid", "tw:grid-cols-\[minmax\(0,_1fr\)\]"/);
  assert.doesNotMatch(tv, /tv-empty-slot|Aguardando cadastro/);
});
