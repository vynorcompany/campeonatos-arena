import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("edição de evento envia somente id, nome e descrição", () => {
  const source = readFileSync(
    "src/components/tournaments/tournament-event-edit-form.tsx",
    "utf8",
  );

  assert.match(source, /name="name"/);
  assert.match(source, /name="description"/);
  assert.match(source, /updateTournamentAction/);
});

test("jogos não oferece atalho para classificação completa", () => {
  const source = readFileSync(
    "src/components/tournaments/category-results-panel.tsx",
    "utf8",
  );

  assert.doesNotMatch(source, /Ver classificação completa/);
});
