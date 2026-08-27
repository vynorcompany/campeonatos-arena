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
  assert.match(dashboard, /Visão de caixa/);
  assert.match(dashboard, /Visão de competência/);
  assert.match(dashboard, /dataInicial/);
  assert.match(dashboard, /dataFinal/);
  assert.match(dashboard, /Este mês/);
  assert.match(dashboard, /Mês passado/);
  assert.match(dashboard, /Últimos 90 dias/);
  assert.match(dashboard, /Últimos 7 dias/);
  assert.match(dashboard, /Comparar/);
  assert.match(dashboard, /comparison/);
});

test("command checkout keeps pending debts compact until the toggle is enabled", () => {
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(card, /Em aberto/);
  assert.match(card, /openDebtTotalCents/);
  assert.match(card, /Incluir débitos/);
  assert.match(card, /command-open-debts-summary/);
  assert.match(card, /Dividir comanda/);
  assert.doesNotMatch(card, />DIVIDIR COMANDA</);
  assert.match(card, /event\.stopPropagation\(\); setCheckoutOpen\(false\)/);
  assert.match(css, /\.command-open-debts \{ display: flex/);
  assert.match(css, /\.command-open-debt-items/);
});
