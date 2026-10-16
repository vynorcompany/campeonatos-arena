import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { assertFinancialEntryRelationsBelongToArena } from "../src/lib/finance/entry-relations";

test("criar, editar e repetir lançamentos recusam conta bancária de outra arena antes de gravar", async () => {
  const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  let writes = 0;
  const relation = { bankAccount: { findFirst: async () => null } };
  const tx = {
    ...relation,
    financialEntry: {
      findFirst: async () => ({ id: "entry-a", source: "MANUAL", settlements: [] }),
      create: async () => { writes += 1; return { id: "new-entry" }; },
      update: async () => { writes += 1; return { id: "entry-a" }; },
    },
    financialRecurrence: { create: async () => { writes += 1; return { id: "recurrence-a" }; } },
  };
  const base = {
    category: "Teste", description: "Teste", counterpartyName: "Cliente", amount: "10,00", discount: "0",
    discountMode: "VALUE", bankAccountId: "bank-from-arena-b", planId: "", productId: "", notes: "",
  };
  const valid = (data: Record<string, unknown>) => ({ safeParse: () => ({ success: true, data }) });
  const mocks: Record<string, unknown> = {
    "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: "arena-a" }), requireModuleEdit: async () => ({ arenaId: "arena-a" }) },
    "@/lib/finance/inputs": { parseMoneyToCents: () => 1000, parseDate: (value: string) => value ? new Date(`${value}T12:00:00Z`) : null },
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
    require: (name: string) => mocks[name] ?? {},
  });

  for (const action of ["createFinancialEntryAction", "updateFinancialEntryAction", "createFinancialRecurrenceAction"]) {
    await assert.rejects(exports[action](new FormData()), /Conta bancária não encontrada nesta arena/, action);
  }
  assert.equal(writes, 0);
});
