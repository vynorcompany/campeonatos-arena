import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("financial ledgers support recurrence, supplier selection and server-side filters", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");
  const ledger = readFileSync(resolve(process.cwd(), "src/components/finance/accounts-ledger.tsx"), "utf8");
  const query = readFileSync(resolve(process.cwd(), "src/lib/finance/accounts.ts"), "utf8");

  assert.match(schema, /model FinancialRecurrence \{/);
  assert.match(schema, /bankAccountId\s+String\?/);
  assert.match(schema, /supplierId\s+String\?/);
  assert.match(actions, /createFinancialRecurrenceAction/);
  assert.match(ledger, /Categorias financeiras/);
  assert.match(ledger, /Criar fornecedor/);
  assert.match(ledger, /Data de vencimento/);
  assert.match(query, /includeEarlier/);
  assert.match(query, /productId/);
  assert.match(query, /planId/);
});

test("receivable plan selectors separate the same standard plan by professor", () => {
  const page = readFileSync(
    resolve(
      process.cwd(),
      "src/app/(app)/financeiro/contas-a-receber/page.tsx",
    ),
    "utf8",
  );
  const ledger = readFileSync(
    resolve(process.cwd(), "src/components/finance/accounts-ledger.tsx"),
    "utf8",
  );

  assert.match(page, /teacherAssignments/);
  assert.match(page, /teacherId/);
  assert.match(page, /teacherName/);
  assert.match(ledger, /<optgroup/);
  assert.match(ledger, /Professor: \$\{group\.teacherName\}/);
  assert.doesNotMatch(ledger, /Professores:/);
});

test("selecting a plan fills the entry value with its configured price", () => {
  const receivables = readFileSync(resolve(process.cwd(), "src/app/(app)/financeiro/contas-a-receber/page.tsx"), "utf8");
  const ledger = readFileSync(resolve(process.cwd(), "src/components/finance/accounts-ledger.tsx"), "utf8");

  assert.match(receivables, /monthlyPriceCents: true/);
  assert.match(ledger, /data-monthly-price-cents=\{plan\.monthlyPriceCents\}/);
  assert.match(ledger, /setNewEntryAmountCents\(priceCents\)/);
});

test("financial setting actions normalize missing optional FormData fields", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");

  assert.match(actions, /const optionalText = z\.preprocess\(\(value\) => value \?\? "", z\.string\(\)\.trim\(\)\.default\(""\)\);/);
  assert.match(actions, /openingBalance: z\.preprocess\(\(value\) => value \?\? "0", z\.string\(\)\.trim\(\)\.default\("0"\)\)/);
  assert.match(actions, /createFinancialSettingAction[\s\S]*withArenaTransaction\(auth\.arenaId, async \(tx\) => \{[\s\S]*tx\.financialCategory\.create/);
});
