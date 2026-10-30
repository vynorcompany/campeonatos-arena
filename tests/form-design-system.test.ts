import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFile } from "./helpers/style-source";
import assert from "node:assert/strict";

import { test } from "node:test";

test("forms use the shared visual control and active-state switch patterns", async () => {
  const [styles, ledger, products] = await Promise.all([
    readFile("src/app/globals.css", "utf8"),
    readFile("src/components/finance/accounts-ledger.tsx", "utf8"),
    readFile("src/components/products/stock-workspace.tsx", "utf8"),
  ]);

  assert.match(styles, /--control-height/);
  assert.match(styles, /:where\(input:not\(\[type=checkbox\]\)/);
  assert.ok(utilityClasses("control-toggle").length, "control-toggle has component Tailwind utilities");
  assert.ok(utilityClasses("control-toggle").length, "control-toggle has component Tailwind utilities");
  assert.match(ledger, /(?:className="control-toggle"|className=\{(?:cx\()?viewStyles\.control_toggle(?:\))?\})/);
  assert.match(ledger, /Anteriores à data inicial/);
  assert.match(ledger, /Incluir estornados\/deletados/);
  assert.match(products, /Filtros de estoque/);
  assert.match(products, /<details/);
  assert.match(products, /NewProductDialog/);
  const productDialog = await readFile("src/components/products/new-product-dialog.tsx", "utf8");
  assert.match(productDialog, /Novo Produto/);
  assert.match(productDialog, /<Modal/);
});

test("financial launches and product management use dedicated operational work areas", async () => {
  const [styles, products, productDetail, pricing, history] = await Promise.all([
    readFile("src/app/globals.css", "utf8"),
    readFile("src/components/products/stock-workspace.tsx", "utf8"),
    readFile("src/app/(app)/pdv/[productId]/page.tsx", "utf8"),
    readFile("src/components/products/product-pricing-fields.tsx", "utf8"),
    readFile("src/components/products/stock-history-dialog.tsx", "utf8"),
  ]);

  assert.match(styleRules("financial-entry-modal"), / width: min\(100%, 1080px\)/);
  const productDialog = await readFile("src/components/products/new-product-dialog.tsx", "utf8");
  assert.match(productDialog, /ProductPricingFields/);
  assert.match(products, /href=\{`\/pdv\/\$\{product\.id\}`\}/);
  assert.match(productDetail, /ProductEditorTabs/);
  assert.match(productDetail, /adjustStockAction/);
  assert.match(productDetail, /ProductFiscalForm/);
  assert.match(pricing, /Preço de custo/);
  assert.match(pricing, /Margem desejada/);
  assert.match(history, /Ver histórico/);
  assert.match(history, /<Modal\s/);
  const modal = await readFile("src/components/ui/modal.tsx", "utf8");
  assert.match(modal, /createPortal/);
  assert.match(modal, /role="dialog"/);
});
