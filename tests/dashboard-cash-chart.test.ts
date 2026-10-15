import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardCashChart } from "../src/app/(app)/painel/dashboard-cash-chart";

test("empty dashboard cash chart explains the lack of movements", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCashChart, { view: "caixa", days: [{ label: "01/10", income: 0, expense: 0 }] }));
  assert.match(html, /Sem movimentação financeira no período/);
  assert.doesNotMatch(html, /dashboard-cash-bars/);
});

test("30-day dashboard chart shows spaced date ticks while retaining every daily bar", () => {
  const days = Array.from({ length: 30 }, (_, index) => ({ label: `${String(index + 1).padStart(2, "0")}/10`, income: index === 0 ? 100 : 0, expense: index === 29 ? 50 : 0 }));
  const html = renderToStaticMarkup(React.createElement(DashboardCashChart, { view: "caixa", days }));
  const dateTicks = [...html.matchAll(/<small>(\d{2}\/10)<\/small>/g)].map((match) => match[1]);
  assert.deepEqual(dateTicks, ["01/10", "07/10", "13/10", "19/10", "25/10", "30/10"]);
  assert.equal((html.match(/dashboard-cash-day/g) ?? []).length, 30);
  assert.match(html, /min-width:580px/);
  assert.match(html, /Total de entradas: R\$\s*1,00/);
});

test("short periods keep every daily label", () => {
  const days = Array.from({ length: 7 }, (_, index) => ({ label: `${index + 1}/10`, income: 1, expense: 0 }));
  const html = renderToStaticMarkup(React.createElement(DashboardCashChart, { view: "competencia", days }));
  assert.equal((html.match(/<small>\d\/10<\/small>/g) ?? []).length, 7);
});
