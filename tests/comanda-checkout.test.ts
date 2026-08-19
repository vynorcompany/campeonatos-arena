import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("command checkout persists split payments and an open receivable for the unpaid balance", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/comanda.ts"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");

  assert.match(schema, /model SalePayment \{/);
  assert.match(schema, /model FinancialSettlement \{/);
  assert.match(schema, /settlements\s+FinancialSettlement\[\]/);
  assert.match(schema, /payments\s+SalePayment\[\]/);
  assert.match(schema, /saleId\s+String\?/);
  assert.match(actions, /paymentsSchema/);
  assert.match(actions, /salePayment\.create/);
  assert.match(actions, /remainingCents/);
  assert.match(actions, /status: "PENDING"/);
  assert.match(card, /command-checkout-modal/);
  assert.match(card, /Adicionar forma de pagamento/);
  assert.match(card, /Conta a receber/);
});

test("command checkout offers only the client's pending balances for joint settlement", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/comanda.ts"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");

  assert.match(page, /pendingDebts/);
  assert.match(page, /scheduleParticipant/);
  assert.match(page, /comanda/);
  assert.match(actions, /debtIds/);
  assert.match(actions, /selectedDebts/);
  assert.match(actions, /settleSelectedDebts/);
  assert.match(actions, /partialDebtPaymentCents/);
  assert.match(actions, /financialSettlement\.create/);
  assert.match(actions, /getOutstandingCents/);
  assert.match(card, /Débitos em aberto/);
  assert.match(card, /Selecionar para quitar junto/);
  assert.match(card, /baixa parcial/);
  assert.match(page, /settlements/);
  assert.match(page, /getOutstandingCents/);
});

test("command product picker opens as a category modal with item quantities", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");

  assert.match(schema, /model ProductCategory \{/);
  assert.match(schema, /categoryId\s+String\?/);
  assert.match(page, /category:/);
  assert.match(card, /command-product-modal/);
  assert.match(card, /Produtos em estoque/);
  assert.match(card, /Quantidade/);
  assert.match(card, /categoryName/);
  assert.ok(existsSync(resolve(process.cwd(), "prisma/migrations/20260819090000_add_comanda_checkout/migration.sql")));
});

test("closed commands are excluded from the active command grid without a duplicate refresh", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");

  assert.match(page, /const \[comandas[\s\S]{0,650}?where: \{\s*arenaId: auth\.arenaId,\s*status: "OPEN",/);
  assert.doesNotMatch(card, /router\.refresh\(\)/);
});
