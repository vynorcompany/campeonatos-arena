import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("financial ledger exposes a client-aware receivables filter and visible create errors", () => {
  const ledger = read("src/components/finance/accounts-ledger.tsx");

  assert.match(ledger, /type === "REVENUE" \? "Cliente" : "Nome"/);
  assert.match(ledger, /accounts-client-filter/);
  assert.match(ledger, /matchingFilterClients/);
  assert.match(ledger, /form-message form-message-error/);
});

test("financial ledger supports selecting, settling, and deleting entries in bulk", () => {
  const ledger = read("src/components/finance/accounts-ledger.tsx");
  const actions = read("src/lib/actions/finance.ts");

  assert.match(ledger, /selectedEntryIds/);
  assert.match(ledger, /Quitar pendentes/);
  assert.match(ledger, /Excluir selecionados/);
  assert.match(actions, /export async function settleFinancialEntriesBulkAction/);
  assert.match(actions, /export async function deleteFinancialEntriesBulkAction/);
  assert.match(actions, /status: "VOIDED"/);
});

test("financial ledger uses subtle alternating row colors", () => {
  const styles = read("src/app/globals.css");

  assert.match(styles, /\.accounts-ledger-row:nth-of-type\(even\)/);
});

test("manual expense creation keeps supplier creation inside the arena RLS transaction", () => {
  const actions = read("src/lib/actions/finance.ts");

  assert.match(actions, /withArenaTransaction\(auth\.arenaId, async \(tx\) => \{[\s\S]*tx\.supplier\.upsert/);
  assert.doesNotMatch(actions, /let supplierId[\s\S]*await prisma\.supplier\.upsert[\s\S]*await withArenaTransaction/);
});

test("financial settings are created inside the active arena RLS transaction", () => {
  const actions = read("src/lib/actions/finance.ts");
  const createSettings = actions.slice(
    actions.indexOf("export async function createFinancialSettingAction"),
    actions.indexOf("export async function upsertPayrollEntryAction")
  );

  assert.match(createSettings, /withArenaTransaction\(auth\.arenaId, async \(tx\) => \{/);
  assert.match(createSettings, /tx\.financialCategory\.create/);
  assert.match(createSettings, /tx\.paymentMethodSetting\.create/);
  assert.match(createSettings, /tx\.bankAccount\.create/);
  assert.match(createSettings, /tx\.supplier\.create/);
});

test("manual entry blocks submission locally until a financial category is selected", () => {
  const ledger = read("src/components/finance/accounts-ledger.tsx");

  assert.match(ledger, /if \(!category\) \{ setMessage\("Selecione uma categoria financeira\."\); return; \}/);
  assert.match(ledger, /pending \? "Salvando\.\.\." : recurring \? "Criar recorrência" : "Salvar lançamento"/);
});

test("lançamento manual aceita campos opcionais que não são exibidos no formulário", () => {
  const actions = read("src/lib/actions/finance.ts");

  assert.match(actions, /supplierId: formData\.get\("supplierId"\) \?\? ""/);
  assert.match(actions, /paidAt: formData\.get\("paidAt"\) \?\? ""/);
});
