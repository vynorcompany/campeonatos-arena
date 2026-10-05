import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";

import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

test("submenus de categoria compartilham a superfície visual da gestão de torneios", () => {
  const layout = readFileSync(resolve(process.cwd(), "src/components/tournaments/tournament-detail-layout.tsx"), "utf8");
  const registration = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-registration-panel.tsx"), "utf8");
  const draw = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-draw-panel.tsx"), "utf8");
  const results = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-results-panel.tsx"), "utf8");
  const history = readFileSync(resolve(process.cwd(), "src/components/tournaments/league-history-panel.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(layout, /category-detail-layout/);
  assert.match(registration, /category-operation-panel/);
  assert.match(draw, /category-operation-panel/);
  assert.match(results, /category-operation-panel/);
  assert.match(history, /league-history-panel/);
  assert.ok(utilityClasses("category-detail-layout").length, "category-detail-layout has component Tailwind utilities");
  assert.ok(utilityClasses("category-operation-panel").length, "category-operation-panel has component Tailwind utilities");
  assert.ok(utilityClasses("category-detail-hero").length, "category-detail-hero has component Tailwind utilities");
  assert.ok(utilityClasses("category-detail-layout").length, "category-detail-layout has component Tailwind utilities");
});

test("visão geral da Liga usa um cabeçalho e painel operacional coerentes", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /category-detail-hero/);
  assert.match(page, /league-overview-bottom/);
  assert.ok(utilityClasses("league-overview-bottom").length, "league-overview-bottom has component Tailwind utilities");
  assert.match(styleRules("league-overview-primary-action", {context: ".button"}), /min-height: 38px/);
});

test("área da categoria mantém ações e formulário de duplas em escala compacta", () => {
  const registration = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-registration-panel.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(registration, /CategoryPairForm/);
  assert.ok(utilityClasses("category-pair-form").length, "category-pair-form has component Tailwind utilities");
  assert.match(styleRules("category-pair-submit", {context: ".button"}), /min-height:/);
  assert.match(styleRules("category-detail-hero"), /padding-top: 18px[\s\S]*padding-right: 20px/);
  assert.ok(utilityClasses("league-overview-bottom").length, "league-overview-bottom has component Tailwind utilities");
});

test("gestão de Liga usa ícones vetoriais distintos para competição e dupla", () => {
  const draw = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-draw-panel.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(draw, /function LeagueTrophyIcon\(/);
  assert.match(draw, /function PairPlayersIcon\(/);
  assert.match(draw, /<LeagueTrophyIcon\s*\/>/);
  assert.match(draw, /<PairPlayersIcon\s*\/>/);
  assert.doesNotMatch(draw, />♧</);
  assert.ok(utilityClasses("league-group-icon").length, "league-group-icon has component Tailwind utilities");
});
