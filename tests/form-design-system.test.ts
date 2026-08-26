import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("forms use the shared visual control and active-state switch patterns", async () => {
  const [styles, ledger, products] = await Promise.all([
    readFile("src/app/globals.css", "utf8"),
    readFile("src/components/finance/accounts-ledger.tsx", "utf8"),
    readFile("src/app/(app)/pdv/page.tsx", "utf8"),
  ]);

  assert.match(styles, /--control-height/);
  assert.match(styles, /:where\(input:not\(\[type="checkbox"\]\)/);
  assert.match(styles, /\.control-toggle/);
  assert.match(styles, /\.control-toggle input:checked \+ span/);
  assert.match(ledger, /className="control-toggle"/);
  assert.match(ledger, /Anteriores à data inicial/);
  assert.match(ledger, /Incluir estornados\/deletados/);
  assert.match(products, /Produtos e Serviços/);
  assert.match(products, /product-management-filters/);
  assert.match(products, /Criar produto\/serviço/);
});

test("financial launches and product management use dedicated spacious work areas", async () => {
  const [styles, products, productDetail] = await Promise.all([
    readFile("src/app/globals.css", "utf8"),
    readFile("src/app/(app)/pdv/page.tsx", "utf8"),
    readFile("src/app/(app)/pdv/[productId]/page.tsx", "utf8"),
  ]);

  assert.match(styles, /\.financial-entry-modal \{ width: min\(100%, 1080px\)/);
  assert.match(products, /href="\/pdv\/novo"/);
  assert.match(products, /href=\{`\/pdv\/\$\{product\.id\}`\}/);
  assert.match(productDetail, /Ajuste de estoque/);
  assert.match(productDetail, /Configurações NFC-e/);
});
