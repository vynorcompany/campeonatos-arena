import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { settlementSchema } from "../src/lib/finance/action-schemas";
import { parseDate, parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { financialEntryPermission } from "../src/lib/finance/entry-permissions";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("receivable surplus honors its setting, preserves interest, audits credit and rejects duplicate or unidentified deposits", { skip: !isolated }, async () => {
 const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
 const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } }); let arenaId = "";
 try {
  const arena = await admin.arena.create({ data: { name: "Receivable surplus QA", slug: `receivable-surplus-${randomUUID()}`, createdById: "goal-test" } }); arenaId = arena.id;
  const player = await admin.player.create({ data: { arenaId, name: "Surplus customer QA" } });
  const bank = await admin.bankAccount.create({ data: { arenaId, name: "Receivables bank QA" } });
  const settings = await admin.arenaOperationalSettings.create({ data: { arenaId, preventOverpayment: true } });
  const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
  const mocks: Record<string, unknown> = {
   "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount },
   "@prisma/client": { Prisma }, "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId, userId: "goal-test", userName: "Surplus QA" }) },
   "@/lib/permissions": { canPerformPermission: () => true }, "@/lib/finance/entry-permissions": { financialEntryPermission },
   "@/lib/finance/action-schemas": { settlementSchema }, "@/lib/finance/inputs": { parseDate, parseMoneyToCents }, "@/lib/finance/ledger": { getFinancialEntryBalance },
   "@/lib/finance/revalidation": { refreshFinanceRoutes() {} }, "@/lib/rls": { withArenaTransaction: (id: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return operation(tx); }) },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, require: (name: string) => mocks[name] ?? {} });
  const entry = await admin.financialEntry.create({ data: { arenaId, bankAccountId: bank.id, playerId: player.id, type: "REVENUE", category: "QA", description: "Receivable QA", amountCents: 1000 } });
  const settle = (id: string, amount = "15,00", interest = "1,00") => { const form = new FormData(); for (const [key, value] of Object.entries({ entryId: id, bankAccountId: bank.id, amount, interest, paymentMethod: "PIX", paidAt: "", notes: "" })) form.set(key, value); return actions.settleFinancialEntryAction(form); };
  await assert.rejects(settle(entry.id), /supera o saldo/); assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: entry.id } }), 0);
  await admin.arenaOperationalSettings.update({ where: { id: settings.id }, data: { preventOverpayment: false } });
  const results = await Promise.allSettled([settle(entry.id), settle(entry.id)]); assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const paid = await admin.financialEntry.findUniqueOrThrow({ where: { id: entry.id }, include: { settlements: true } });
  assert.equal(paid.status, "PAID"); assert.equal(paid.settlements.length, 1); assert.equal(paid.settlements[0].amountCents, 1100); assert.equal(paid.settlements[0].interestCents, 100);
  assert.equal((await admin.clientBalanceMovement.findFirstOrThrow({ where: { arenaId, playerId: player.id } })).kind, "MONEY");
  assert.equal((await admin.clientBalanceMovement.aggregate({ where: { arenaId, playerId: player.id }, _sum: { amountCents: true } }))._sum.amountCents, 400);
  const credit = await admin.financialEntry.findFirstOrThrow({ where: { arenaId, category: "CREDITO_DE_CLIENTE" }, include: { settlements: true } });
  assert.equal(credit.amountCents, 400); assert.equal(credit.bankAccountId, bank.id); assert.equal(credit.settlements[0].amountCents + paid.settlements[0].amountCents, 1500);
  assert.equal(await admin.auditEvent.count({ where: { arenaId, action: "RECEIVABLE_SURPLUS_CREDIT" } }), 1);
  const anonymous = await admin.financialEntry.create({ data: { arenaId, type: "REVENUE", category: "QA", description: "Anonymous QA", amountCents: 1000 } });
  await assert.rejects(settle(anonymous.id), /Vincule um cliente/);
  const expense = await admin.financialEntry.create({ data: { arenaId, type: "EXPENSE", category: "QA", description: "Expense QA", amountCents: 1000 } });
  await assert.rejects(settle(expense.id), /supera o saldo/);
  assert.equal(await admin.clientBalanceMovement.count({ where: { arenaId } }), 1);
 } finally { if (arenaId) await admin.arena.deleteMany({ where: { id: arenaId } }); await runtime.$disconnect(); await admin.$disconnect(); }
});
