import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { matchesPlanPaymentFilter } from "../src/lib/reports/plan-payment-filter";

const now = new Date("2026-10-12T15:00:00.000Z");
const alice = { planId: "plan-a", student: { playerId: "alice", name: "Alice" } };
const bob = { planId: "plan-a", student: { playerId: "bob", name: "Bob" } };
const entry = (playerId: string | null, status: string, dueDate: string, counterpartyName = "") =>
  ({ planId: "plan-a", playerId, counterpartyName, status, dueDate: new Date(dueDate) });

test("pagamento de outro aluno no mesmo plano não altera o filtro da assinatura", () => {
  const entries = [entry("alice", "PAID", "2026-10-10T00:00:00.000Z"), entry("bob", "PENDING", "2026-10-10T00:00:00.000Z")];
  assert.equal(matchesPlanPaymentFilter(alice, entries, "PAID", now), true);
  assert.equal(matchesPlanPaymentFilter(bob, entries, "PAID", now), false);
  assert.equal(matchesPlanPaymentFilter(bob, entries, "OVERDUE", now), true);
  assert.equal(matchesPlanPaymentFilter(alice, entries, "OVERDUE", now), false);
});

test("cobrança legada sem playerId corresponde apenas ao nome do aluno", () => {
  const entries = [entry(null, "PENDING", "2026-10-12T00:00:00.000Z", "Alice")];
  assert.equal(matchesPlanPaymentFilter(alice, entries, "PENDING", now), true);
  assert.equal(matchesPlanPaymentFilter(bob, entries, "PENDING", now), false);
  assert.equal(matchesPlanPaymentFilter(alice, entries, "OVERDUE", now), false);
});

test("relatório filtra cobranças pelo vencimento no período, não pela criação de todas as 12 parcelas", () => {
  const page = readFileSync(new URL("../src/app/(app)/relatorios/[relatorio]/page.tsx", import.meta.url), "utf8");
  const reportData = readFileSync(new URL("../src/lib/reports/plan-report-data.ts", import.meta.url), "utf8");
  assert.match(page, /loadPlanReportData\(tx, auth\.arenaId, period/);
  assert.match(reportData, /planId: \{ not: null \}, dueDate: period/);
  assert.match(reportData, /matchesPlanPaymentFilter\(subscription, entriesByPlan\.get\(subscription\.planId\)/);
});
