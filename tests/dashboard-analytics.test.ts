import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("dashboard renders a daily cash-flow chart and the requested operational charts", () => {
  const dashboard = readFileSync(resolve(process.cwd(), "src/app/(app)/painel/page.tsx"), "utf8");
  const analytics = readFileSync(resolve(process.cwd(), "src/lib/reports/dashboard-analytics.ts"), "utf8");
  const flow = readFileSync(resolve(process.cwd(), "src/app/(app)/painel/dashboard-flow-panel.tsx"), "utf8");
  const comparison = readFileSync(resolve(process.cwd(), "src/components/dashboard-comparison-filter.tsx"), "utf8");

  assert.match(dashboard, /DashboardFreeLayout/);
  assert.match(dashboard, /DashboardMetricTile/);
  assert.match(flow, /Fluxo de caixa diário/);
  assert.match(flow, /dashboard-cash-chart/);
  assert.match(dashboard, /Quadras com mais reservas/);
  assert.match(dashboard, /Produtos mais vendidos/);
  assert.match(dashboard, /Aulas por professor/);
  assert.match(analytics, /Ocupação das quadras/);
  assert.match(analytics, /dashboardCourtOccupancy/);
  assert.match(analytics, /receipts/);
  assert.match(dashboard, /Visão de caixa/);
  assert.match(dashboard, /Visão de competência/);
  assert.match(dashboard, /dataInicial/);
  assert.match(dashboard, /dataFinal/);
  assert.match(dashboard, /Este mês/);
  assert.match(dashboard, /Mês passado/);
  assert.match(dashboard, /Últimos 90 dias/);
  assert.match(dashboard, /Últimos 7 dias/);
  assert.match(dashboard, /DashboardComparisonFilter/);
  assert.match(dashboard, /comparison/);
  assert.match(comparison, /Mês anterior/);
  assert.match(comparison, /Mesmo período do ano passado/);
  assert.match(comparison, /Personalizado/);
});

test("dashboard only reads prior-period totals when comparison is enabled", () => {
  const dashboard = readFileSync(resolve(process.cwd(), "src/app/(app)/painel/page.tsx"), "utf8");
  const loader = readFileSync(resolve(process.cwd(), "src/lib/reports/dashboard-data.ts"), "utf8");
  assert.match(dashboard, /comparing \? previous.from : undefined/);
  assert.match(loader, /previousFrom && previousTo \? tx\.financialEntry\.findMany/);
  assert.match(loader, /previousFrom && previousTo \? tx\.scheduleOccurrence\.count/);
});

test("shared layout waits for tenant-scoped notifications during a connection spike", () => {
  const layout = readFileSync(resolve(process.cwd(), "src/app/(app)/layout.tsx"), "utf8");
  assert.match(layout, /arenaDatabase\(auth\.arenaId\)\.\$transaction\(/);
  assert.match(layout, /tx\.arenaNotification\.findMany\(\{ where: \{ arenaId: auth\.arenaId/);
  assert.match(layout, /maxWait: 20_000, timeout: 10_000/);
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
  assert.match(styleRules("command-open-debts"), / display: grid/);
  assert.ok(utilityClasses("command-open-debt-items").length, "command-open-debt-items has component Tailwind utilities");
});
