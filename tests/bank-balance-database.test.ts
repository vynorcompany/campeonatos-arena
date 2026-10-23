import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { calculateBankAccountBalanceCents, parseBankBalanceCents } from "../src/lib/finance/bank-balance";
import { bankBalanceSchema } from "../src/lib/finance/action-schemas";
import { parseMoneyToCents } from "../src/lib/finance/inputs";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("saldo bancário separa arenas e inclui pagamentos parciais, sem repetir baixas", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const accounts: string[] = [];
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const first = await admin.bankAccount.create({ data: { arenaId: arenaA.id, name: `Banco fictício GOAL ${randomUUID()}`, openingBalanceCents: 1000 }, select: { id: true } });
    const second = await admin.bankAccount.create({ data: { arenaId: arenaB.id, name: `Banco beta fictício GOAL ${randomUUID()}`, openingBalanceCents: 0 }, select: { id: true } });
    accounts.push(first.id, second.id);
    const create = (arenaId: string, bankAccountId: string, type: string, status: string, amountCents: number) => admin.financialEntry.create({
      data: { arenaId, bankAccountId, type, status, amountCents, category: "GOAL", description: "Teste fictício de saldo" }, select: { id: true },
    });
    await create(arenaA.id, first.id, "REVENUE", "PAID", 2000);
    await create(arenaA.id, first.id, "INCOME", "PAID", 500);
    await create(arenaA.id, first.id, "REVENUE", "VOIDED", 1000);
    const partialIncome = await create(arenaA.id, first.id, "REVENUE", "PENDING", 1000);
    const settledExpense = await create(arenaA.id, first.id, "EXPENSE", "PAID", 300);
    const partialExpense = await create(arenaA.id, first.id, "EXPENSE", "PENDING", 500);
    for (const [entryId, amountCents] of [[partialIncome.id, 400], [settledExpense.id, 300], [partialExpense.id, 100]] as const) {
      await admin.financialSettlement.create({ data: { arenaId: arenaA.id, financialEntryId: entryId, amountCents, paymentMethod: "PIX" } });
    }
    await create(arenaB.id, second.id, "REVENUE", "PAID", 100000);

    const actual = await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      return calculateBankAccountBalanceCents(tx, arenaA.id, first.id, 1000);
    });
    assert.equal(actual, 3500);
  } finally {
    if (accounts.length) {
      await admin.financialEntry.deleteMany({ where: { bankAccountId: { in: accounts } } });
      await admin.bankAccount.deleteMany({ where: { id: { in: accounts } } });
    }
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("duas conciliações simultâneas não criam ajustes bancários duplicados", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  let accountId = "";
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    accountId = (await admin.bankAccount.create({ data: { arenaId: arena.id, name: `Conciliação simultânea GOAL ${randomUUID()}`, openingBalanceCents: 0 }, select: { id: true } })).id;
    const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
    const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requirePermission: async (key: string) => { assert.equal(key, "finance:settings:manage"); return { arenaId: arena.id }; } },
      "@/lib/finance/action-schemas": { bankBalanceSchema },
      "@/lib/finance/inputs": { parseMoneyToCents },
      "@/lib/finance/bank-balance": { calculateBankAccountBalanceCents, parseBankBalanceCents },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {}, refreshFinancialSettings() {} },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports: actions, FormData, Date, Intl, require: (name: string) => mocks[name] ?? {},
    });
    const reconcile = () => {
      const form = new FormData();
      form.set("bankAccountId", accountId);
      form.set("balance", "10,00");
      return actions.reconcileBankAccountBalanceAction(form);
    };
    const outcomes = await Promise.allSettled([reconcile(), reconcile()]);
    assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 2);
    assert.equal(outcomes.filter((outcome) => outcome.status === "rejected").length, 0);
    const adjustments = await admin.financialEntry.findMany({ where: { arenaId: arena.id, bankAccountId: accountId }, select: { type: true, amountCents: true } });
    assert.deepEqual(adjustments, [{ type: "REVENUE", amountCents: 1000 }]);
  } finally {
    if (accountId) {
      await admin.financialEntry.deleteMany({ where: { bankAccountId: accountId } });
      await admin.bankAccount.delete({ where: { id: accountId } });
    }
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
