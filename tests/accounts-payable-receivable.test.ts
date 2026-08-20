import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("financial navigation separates accounts payable from accounts receivable", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");

  assert.match(navigation, /href: "\/financeiro\/contas-a-receber", label: "Contas a Receber"/);
  assert.match(navigation, /href: "\/financeiro\/contas-a-pagar", label: "Contas a Pagar"/);
});

test("accounts pages expose sequential ledgers and deferred new-entry forms", () => {
  const receivablePath = resolve(process.cwd(), "src/app/(app)/financeiro/contas-a-receber/page.tsx");
  const payablePath = resolve(process.cwd(), "src/app/(app)/financeiro/contas-a-pagar/page.tsx");

  assert.ok(existsSync(receivablePath));
  assert.ok(existsSync(payablePath));
  assert.match(readFileSync(receivablePath, "utf8"), /Contas a Receber/);
  assert.match(readFileSync(payablePath, "utf8"), /Contas a Pagar/);
});

test("financial entries keep settlement interest and void audit data", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");

  assert.match(schema, /voidedAt\s+DateTime\?/);
  assert.match(schema, /voidReason\s+String\s+@default\(""\)/);
  assert.match(schema, /interestCents\s+Int\s+@default\(0\)/);
  assert.match(actions, /settleFinancialEntryAction/);
  assert.match(actions, /voidFinancialEntryAction/);
});
