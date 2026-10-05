import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFile } from "./helpers/style-source";
import assert from "node:assert/strict";
import test from "node:test";


test("contas a receber fornece clientes cadastrados para o editor de lançamento", async () => {
  const page = await readFile("src/app/(app)/financeiro/contas-a-receber/page.tsx", "utf8");
  const ledger = await readFile("src/components/finance/accounts-ledger.tsx", "utf8");

  assert.match(page, /prisma\.player\.findMany/);
  assert.match(page, /clients=\{clients\}/);
  assert.match(ledger, /clients: Option\[\]/);
  assert.match(ledger, /matchingClients/);
  assert.match(ledger, /Selecionar cliente cadastrado/);
});

test("a busca de cliente usa um painel expandido com identificação e rolagem", async () => {
  const page = await readFile("src/app/(app)/financeiro/contas-a-receber/page.tsx", "utf8");
  const ledger = await readFile("src/components/finance/accounts-ledger.tsx", "utf8");
  const styles = await readFile("src/app/globals.css", "utf8");

  assert.match(page, /phone: true/);
  assert.match(ledger, /client-search-panel/);
  assert.match(ledger, /client\.phone/);
  assert.ok(utilityClasses("client-search-panel").length, "client-search-panel has component Tailwind utilities");
  assert.match(styles, /max-height: 260px/);
});
