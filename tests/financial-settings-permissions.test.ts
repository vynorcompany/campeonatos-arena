import { readFileSync } from "./helpers/domain-source";
import assert from "node:assert/strict";

import test from "node:test";
import vm from "node:vm";
import { parseBankBalanceCents } from "../src/lib/finance/bank-balance";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

test("cadastros e conexões financeiras exigem permissão de configuração antes de gravar", async () => {
  const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
  const seen: string[] = [];
  vm.runInNewContext(compiled, {
    exports: actions, FormData, Date,
    require: (name: string) => name === "@/lib/auth/guards" ? {
      requirePermission: async (key: string) => { seen.push(key); throw new Error("SEM_ACESSO"); },
      requireModuleEdit: async () => { throw new Error("GUARDA_GENERICA"); },
    } : {},
  });
  const settingActions = [
    "createFinancialSettingAction", "reconcileBankAccountBalanceAction", "createProductCategoryAction",
    "createCouponAction", "updateCouponAction", "deleteCouponAction", "toggleCouponActiveAction",
    "updateFinancialCategoryAction", "deleteFinancialCategoryAction", "updateSupplierAction",
    "deleteSupplierAction", "updateFiscalSettingsAction", "updateOnlinePaymentSettingsAction",
    "connectPaymentProviderAction",
  ];
  for (const action of settingActions) await assert.rejects(actions[action](new FormData()), /SEM_ACESSO/, action);
  assert.deepEqual(seen, settingActions.map(() => "finance:settings:manage"));
});

test("conciliação cria receita atual e não repete ajuste quando o saldo já confere", async () => {
  const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
  const created: { type: string; amountCents: number }[] = [];
  let calculatedBalance = 1000;
  const tx = {
    $queryRaw: async () => [],
    bankAccount: { findFirst: async () => ({ id: "bank-a", name: "Conta fictícia", openingBalanceCents: 0 }) },
    financialEntry: { create: async ({ data }: { data: { type: string; amountCents: number } }) => { created.push(data); calculatedBalance += data.type === "REVENUE" ? data.amountCents : -data.amountCents; } },
  };
  const mocks: Record<string, unknown> = {
    "@/lib/auth/guards": { requirePermission: async (key: string) => { assert.equal(key, "finance:settings:manage"); return { arenaId: "arena-a" }; } },
    "@/lib/finance/action-schemas": { bankBalanceSchema: { safeParse: (data: { balance: string }) => ({ success: true, data: { bankAccountId: "bank-a", balance: data.balance } }) } },
    "@/lib/finance/inputs": { parseMoneyToCents: (value: string) => Number(value) * 100 },
    "@/lib/finance/bank-balance": { parseBankBalanceCents, calculateBankAccountBalanceCents: async () => calculatedBalance },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx) },
    "@/lib/finance/revalidation": { refreshFinanceRoutes() {}, refreshFinancialSettings() {} },
  };
  vm.runInNewContext(compiled, { exports: actions, FormData, Date, Intl, require: (name: string) => mocks[name] ?? {} });
  const form = new FormData();
  form.set("balance", "20");
  await actions.reconcileBankAccountBalanceAction(form);
  assert.equal(created.length, 1);
  assert.equal(created[0].type, "REVENUE");
  assert.equal(created[0].amountCents, 1000);
  assert.equal(await actions.reconcileBankAccountBalanceAction(form), undefined);
  assert.equal(created.length, 1);
});

test('provider connector accepts its own form without unrelated optional credentials', async () => {
  const { paymentConnectionSchema } = await import('../src/lib/finance/action-schemas');
  const saved: any[] = [];
  const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
  const mocks: Record<string, unknown> = {
    '@/lib/auth/guards': { requirePermission: async () => ({ arenaId: 'arena-a' }) },
    '@/lib/finance/action-schemas': { paymentConnectionSchema },
    '@/lib/rls': { withArenaTransaction: async (_id: string, run: any) => run({ paymentConnection: { upsert: async (input: any) => saved.push(input) } }) },
    '@/lib/payments/connection-secrets': { encryptConnectionSecrets: () => 'encrypted-synthetic-credentials' },
  };
  vm.runInNewContext(compiled, { exports: actions, FormData, Date, require: (name: string) => mocks[name] ?? {} });
  const form = new FormData();
  for (const [name, value] of Object.entries({ provider: 'SICOOB', environment: 'SANDBOX', clientId: 'synthetic-client', clientSecret: 'synthetic-secret', pixKey: 'synthetic-pix', certificate: 'synthetic-certificate', privateKey: 'synthetic-private-key' })) form.set(name, value);
  await actions.connectPaymentProviderAction(form); assert.equal(saved.length, 1);
  assert.equal(saved[0].create.encryptedSecrets, 'encrypted-synthetic-credentials');
  form.delete('clientSecret'); await assert.rejects(actions.connectPaymentProviderAction(form), /Informe Client ID/); assert.equal(saved.length, 1);
});
