import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("dashboard renders a daily cash-flow chart and the requested operational charts", () => {
  const dashboard = readFileSync(resolve(process.cwd(), "src/app/(app)/painel/page.tsx"), "utf8");

  assert.match(dashboard, /Resumo financeiro/);
  assert.match(dashboard, /Fluxo de caixa diário/);
  assert.match(dashboard, /dashboard-cash-chart/);
  assert.match(dashboard, /Quadras com mais reservas/);
  assert.match(dashboard, /Produtos mais vendidos/);
  assert.match(dashboard, /Alunos por professor/);
  assert.match(dashboard, /paidAt/);
});

test("command checkout keeps pending debts compact until the toggle is enabled", () => {
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(card, /Valor em aberto/);
  assert.match(card, /openDebtTotalCents/);
  assert.match(card, /Incluir débitos em aberto/);
  assert.match(css, /\.command-open-debts \{ display: flex/);
  assert.match(css, /\.command-open-debt-items/);
});
