import { readFileSync } from "node:fs";
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
  assert.match(styles, /\.category-detail-layout/);
  assert.match(styles, /\.category-operation-panel/);
  assert.match(styles, /\.category-detail-hero/);
  assert.match(styles, /\.category-detail-layout \.league-history-panel/);
});

test("visão geral da Liga usa um cabeçalho e painel operacional coerentes", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(page, /category-detail-hero/);
  assert.match(page, /league-management-panel/);
  assert.match(styles, /\.league-management-panel/);
  assert.match(styles, /\.league-cycle-actions/);
});

test("área da categoria mantém ações e formulário de duplas em escala compacta", () => {
  const registration = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-registration-panel.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(registration, /category-pair-form/);
  assert.match(registration, /category-pair-submit/);
  assert.match(styles, /\.category-pair-form/);
  assert.match(styles, /\.category-pair-submit \.(?:button|button-primary)/);
  assert.match(styles, /\.category-detail-hero[^\n]*padding: 18px 20px/);
  assert.match(styles, /\.league-management-panel[^\n]*grid-template-columns: minmax\(0, 1fr\) 230px/);
});
