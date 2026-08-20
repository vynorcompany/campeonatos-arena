import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("contas a receber fornece clientes cadastrados para o editor de lançamento", async () => {
  const page = await readFile("src/app/(app)/financeiro/contas-a-receber/page.tsx", "utf8");
  const ledger = await readFile("src/components/finance/accounts-ledger.tsx", "utf8");

  assert.match(page, /prisma\.player\.findMany/);
  assert.match(page, /clients=\{clients\}/);
  assert.match(ledger, /clients: Option\[\]/);
  assert.match(ledger, /matchingClients/);
  assert.match(ledger, /Selecionar cliente cadastrado/);
});
