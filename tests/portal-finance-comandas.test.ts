import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("portal shows active comandas separately from payable receivables", () => {
  const service = read("src/lib/services/public-client-home.ts");
  const list = read("src/components/public-finance-entry-list.tsx");
  const portal = read("src/components/tournaments/public-standings.tsx");

  assert.match(service, /tx\.comanda\.findMany\(\{/);
  assert.match(service, /status: "OPEN", items: \{ some: \{\} \}/);
  assert.match(service, /sale: \{ comanda: \{ playerId \} \}/);
  assert.match(service, /entry\.status === "PAID" \|\| !outstandingCents \? "paid"/);
  assert.match(portal, /id: "comandas", label: "Comandas"/);
  assert.match(portal, /content: <PortalClientComandas data=\{comandas\}/);
  assert.match(portal, /comandas=\{finance\.comandas\}/);
});

test("closed comanda receivables remain payable and keep their sale in sync", () => {
  const comanda = read("src/lib/actions/comanda.ts");
  const payment = read("src/lib/actions/public-finance-payment.ts");
  const webhook = read("src/app/api/payments/mercado-pago/webhook/route.ts");

  assert.match(comanda, /saleId: sale\.id, playerId: allocation\.playerId, type: "REVENUE", category: "COMANDAS"/);
  assert.match(payment, /sale: \{ comanda: \{ playerId: auth\.playerId \} \}/);
  assert.match(webhook, /settledComandaSaleIds/);
  assert.match(webhook, /tx\.salePayment\.create/);
  assert.match(webhook, /tx\.sale\.update/);
});

test("soon-due portal payments retain contrast in the dark theme", () => {
  const styles = read("src/app/globals.css");
  assert.match(styleRules("client-finance-entry", {"context":".public-finance-entry.is-due-soon"}), /background(?:-color|-image)?: var\(--portal-panel-image,linear-gradient/);
  assert.match(styleRules("client-finance-entry", {"context":".public-finance-entry.is-due-soon strong"}), /color: var\(--portal-ink,#fff7e8\)/);
});
