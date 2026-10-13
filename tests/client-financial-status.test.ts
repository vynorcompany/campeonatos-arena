import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clientFinancialStatus, matchesClientFinancialFilter } from "../src/lib/finance/client-financial-status";

const today = new Date("2026-10-12T15:00:00.000Z");
const entry = (status: string, dueDate: string | null) => ({ status, dueDate: dueDate ? new Date(dueDate) : null });

test("cliente com mensalidade pendente vencida aparece em atraso mesmo sem status OVERDUE gravado", () => {
  const status = clientFinancialStatus([entry("PENDING", "2026-10-11T00:00:00.000Z")], today);
  assert.equal(status, "Em atraso");
  assert.equal(matchesClientFinancialFilter(status, "OVERDUE"), true);
  assert.equal(matchesClientFinancialFilter(status, "OPEN"), true);
  assert.equal(matchesClientFinancialFilter(status, "CURRENT"), false);
});

test("vencimento de hoje não está atrasado; faturas futuras são abertas e quitadas não pesam", () => {
  assert.equal(clientFinancialStatus([entry("PENDING", "2026-10-12T00:00:00.000Z")], today), "Com débitos em aberto");
  assert.equal(clientFinancialStatus([entry("PENDING", "2026-11-12T00:00:00.000Z")], today), "Com débitos em aberto");
  assert.equal(clientFinancialStatus([entry("PAID", "2026-09-12T00:00:00.000Z")], today), "Adimplente");
  assert.equal(matchesClientFinancialFilter("Adimplente", "CURRENT"), true);
});

test("listagem consulta lançamentos diretos do cliente, inclusive mensalidades de plano", () => {
  const page = readFileSync(new URL("../src/app/(app)/jogadores/page.tsx", import.meta.url), "utf8");
  assert.match(page, /financialEntries: \{ where: \{ status: \{ in: \["PENDING", "OVERDUE"\]/);
  assert.match(page, /clientFinancialStatus\(entriesFor\(player\)\)/);
});
