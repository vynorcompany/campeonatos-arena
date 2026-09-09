import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("client portal marks open receivables past their due date as overdue", () => {
  const home = read("src/lib/services/public-client-home.ts");
  const portal = read("src/components/tournaments/public-standings.tsx");

  assert.match(home, /select: \{ amountCents: true, dueDate: true \}/);
  assert.match(home, /entry\.dueDate && entry\.dueDate < today/);
  assert.match(home, /em atraso/);
  assert.match(home, /financialStatus: overdue \? "overdue" : due \? "pending" : "active"/);
  assert.match(portal, /financialStatus === "overdue" \? "is-overdue"/);
  assert.match(portal, /portal-financial-overdue/);
});

test("financial ledger highlights pending entries that are past due", () => {
  const ledger = read("src/components/finance/accounts-ledger.tsx");
  const styles = read("src/app/globals.css");

  assert.match(ledger, /function isOverdue\(entry: Account\)/);
  assert.match(ledger, /accounts-ledger-row-overdue/);
  assert.match(ledger, /EM ATRASO/);
  assert.match(styles, /\.accounts-ledger-row-overdue/);
  assert.match(styles, /\.account-status-overdue/);
});

test("financial deletion is an explicit user permission and remains auditable", () => {
  const permissions = read("src/lib/permissions.ts");
  const guards = read("src/lib/auth/guards.ts");
  const actions = read("src/lib/actions/finance.ts");
  const users = read("src/components/users/permission-matrix.tsx");

  assert.match(permissions, /financialEntryDeletePermission/);
  assert.match(permissions, /canDeleteFinancialEntries/);
  assert.match(guards, /requireFinancialEntryDelete/);
  assert.match(actions, /export async function deleteFinancialEntryAction/);
  assert.match(actions, /Excluído por \$\{auth\.userName\}/);
  assert.match(actions, /status: "VOIDED"/);
  assert.match(users, /Excluir lançamentos/);
  assert.match(users, /name="financialEntryDelete"/);
});

test("financial ledger only exposes deletion to users with the explicit permission", () => {
  const ledger = read("src/components/finance/accounts-ledger.tsx");
  const receivable = read("src/app/(app)/financeiro/contas-a-receber/page.tsx");
  const payable = read("src/app/(app)/financeiro/contas-a-pagar/page.tsx");
  const styles = read("src/app/globals.css");

  assert.match(ledger, /canDeleteEntries: boolean/);
  assert.match(ledger, /canDeleteEntries && entry\.status !== "VOIDED"/);
  assert.match(ledger, /Excluir/);
  assert.match(receivable, /canDeleteEntries=/);
  assert.match(payable, /canDeleteEntries=/);
  assert.match(styles, /\.accounts-filters-submit/);
});
