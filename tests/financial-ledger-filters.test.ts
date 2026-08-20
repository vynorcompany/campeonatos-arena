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
