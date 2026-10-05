import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFile } from "./helpers/style-source";
import assert from "node:assert/strict";

import { test } from "node:test";

test("forms use the shared visual control and active-state switch patterns", async () => {
  const [styles, ledger, products] = await Promise.all([
    readFile("src/app/globals.css", "utf8"),
    readFile("src/components/finance/accounts-ledger.tsx", "utf8"),
    readFile("src/app/(app)/pdv/page.tsx", "utf8"),
  ]);

  assert.match(styles, /--control-height/);
  assert.match(styles, /:where\(input:not\(\[type=checkbox\]\)/);
  assert.ok(utilityClasses("control-toggle").length, "control-toggle has component Tailwind utilities");
  assert.ok(utilityClasses("control-toggle").length, "control-toggle has component Tailwind utilities");
  assert.match(ledger, /(?:className="control-toggle"|className=\{(?:cx\()?viewStyles\.control_toggle(?:\))?\})/);
  assert.match(ledger, /Anteriores à data inicial/);
  assert.match(ledger, /Incluir estornados\/deletados/);
  assert.match(products, /Produtos e Serviços/);
  assert.match(products, /product-management-filters/);
  assert.match(products, /Criar produto\/serviço/);
});

test("financial launches and product management use dedicated spacious work areas", async () => {
  const [styles, products, productDetail, pricing, history] = await Promise.all([
    readFile("src/app/globals.css", "utf8"),
    readFile("src/app/(app)/pdv/page.tsx", "utf8"),
    readFile("src/app/(app)/pdv/[productId]/page.tsx", "utf8"),
    readFile("src/components/products/product-pricing-fields.tsx", "utf8"),
    readFile("src/components/products/stock-history-dialog.tsx", "utf8"),
  ]);

  assert.match(styleRules("financial-entry-modal"), / width: min\(100%, 1080px\)/);
  assert.match(products, /href="\/pdv\/novo"/);
  assert.match(products, /href=\{`\/pdv\/\$\{product\.id\}`\}/);
  assert.match(productDetail, /Ajuste de estoque/);
  assert.match(productDetail, /Configurações NFC-e/);
  assert.match(pricing, /Preço de custo/);
  assert.match(pricing, /Margem desejada/);
  assert.match(history, /Ver histórico/);
  assert.match(history, /createPortal/);
});
