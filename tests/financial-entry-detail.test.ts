import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("financial ledger opens editable entries and links registered clients", async () => {
  const [ledger, actions, accounts] = await Promise.all([
    readFile("src/components/finance/accounts-ledger.tsx", "utf8"),
    readFile("src/lib/actions/finance.ts", "utf8"),
    readFile("src/lib/finance/accounts.ts", "utf8"),
  ]);

  assert.match(ledger, /updateFinancialEntryAction/);
  assert.match(ledger, /setSelectedEntry\(entry\)/);
  assert.match(ledger, /financial-entry-modal/);
  assert.match(ledger, /\/jogadores\?q=/);
  assert.match(actions, /export async function updateFinancialEntryAction/);
  assert.match(actions, /O valor não pode ser menor que o total já baixado/);
  assert.match(accounts, /paymentMethod: entry\.paymentMethod/);
  assert.match(accounts, /settlements:/);
});
