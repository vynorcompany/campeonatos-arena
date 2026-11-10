import { entryAdjustedAmount, entryAdjustmentNotes } from "../src/lib/finance/entry-adjustments";
import { withDatabaseModuleMocks } from "./helpers/client-module-mocks";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { assertFinancialEntryRelationsBelongToArena } from "../src/lib/finance/entry-relations";
import { readCardInstallmentCount } from "../src/lib/finance/card-installments";
import { financialEntryPermission } from "../src/lib/finance/entry-permissions";

test("criar, editar e repetir lançamentos recusam conta bancária de outra arena antes de gravar", async () => {
  const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  let writes = 0;
  const relation = { bankAccount: { findFirst: async () => null } };
  const tx = {
    $queryRaw: async () => [],
    ...relation,
    financialEntry: {
      findFirst: async () => ({ id: "entry-a", updatedAt: new Date("2026-11-02T12:00:00.000Z"), type: "EXPENSE", source: "MANUAL", settlements: [] }),
      create: async () => { writes += 1; return { id: "new-entry" }; },
      update: async () => { writes += 1; return { id: "entry-a" }; },
    },
    financialRecurrence: { create: async () => { writes += 1; return { id: "recurrence-a" }; } },
  };
  const base = {
    category: "Teste", description: "Teste", counterpartyName: "Cliente", amount: "10,00", discount: "0",
    interest: "0", discountMode: "AMOUNT", bankAccountId: "bank-from-arena-b", planId: "", productId: "", notes: "",
  };
  const valid = (data: Record<string, unknown>) => ({ safeParse: () => ({ success: true, data }) });
  const mocks: Record<string, unknown> = {
    "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: "arena-a" }), requireModuleEdit: async () => ({ arenaId: "arena-a" }) },
    "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId: "arena-a" }) },
    "@/lib/permissions": { canPerformPermission: () => true },
    "@/lib/finance/entry-permissions": { financialEntryPermission },
    "@/lib/finance/card-installments": { readCardInstallmentCount },
    "@/lib/finance/inputs": { parseMoneyToCents: () => 1000, parseDate: (value: string) => value ? new Date(`${value}T12:00:00Z`) : null },
    "@/lib/finance/entry-adjustments": { entryAdjustedAmount, entryAdjustmentNotes },
    "@/lib/finance/discounts": { getDiscountedAmountCents: () => 1000 },
    "@/lib/finance/entry-relations": { assertFinancialEntryRelationsBelongToArena },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx) },
    "@/lib/finance/action-schemas": {
      entrySchema: valid({ ...base, type: "EXPENSE", supplierId: "", paymentMethod: "", status: "PENDING", dueDate: "", paidAt: "" }),
      updateEntrySchema: valid({ ...base, entryId: "entry-a", dueDate: "" }),
      recurrenceSchema: valid({ ...base, type: "EXPENSE", frequency: "MONTHLY", startsAt: "2040-01-01", endsAt: "", onlinePaymentMethod: "" }),
    },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    FormData,
    Date,
    require: withDatabaseModuleMocks((name: string) => mocks[name] ?? {}),
  });

  for (const action of ["createFinancialEntryAction", "updateFinancialEntryAction", "createFinancialRecurrenceAction"]) {
    const form = new FormData(); form.set("expectedUpdatedAt", "2026-11-02T12:00:00.000Z");
    await assert.rejects(exports[action](form), /Conta bancária não encontrada nesta arena/, action);
  }
  assert.equal(writes, 0);
});

test("estorno usa o tipo armazenado, não o tipo adulterado no formulário", async () => {
  const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  let writes = 0;
  const tx = {
    financialEntry: {
      findFirst: async () => ({ type: "EXPENSE" }),
      updateMany: async () => { writes += 1; return { count: 1 }; },
    },
  };
  const mocks: Record<string, unknown> = {
    "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId: "arena-a" }) },
    "@/lib/permissions": { canPerformPermission: (key: string) => key === "finance:receivable:edit" },
    "@/lib/finance/entry-permissions": { financialEntryPermission },
    "@/lib/finance/card-installments": { readCardInstallmentCount },
    "@/lib/finance/action-schemas": { voidEntrySchema: { safeParse: () => ({ success: true, data: { entryId: "expense-a", reason: "Teste" } }) } },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx) },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, FormData, Date,
    require: withDatabaseModuleMocks((name: string) => mocks[name] ?? {}),
  });
  const form = new FormData();
  form.set("type", "REVENUE");
  await assert.rejects(exports.voidFinancialEntryAction(form), /Sem permissão/);
  assert.equal(writes, 0);
});
