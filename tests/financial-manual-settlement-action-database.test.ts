import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { Prisma, PrismaClient } from "@prisma/client";
import ts from "typescript";
import { bulkEntrySchema, settlementSchema } from "../src/lib/finance/action-schemas";
import { parseDate, parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("baixa manual exige valor real, quita vencidos e não aceita lote parcialmente inválido", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const entryIds: string[] = [];
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const pending = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Conta fictícia pendente", amountCents: 1000 }, select: { id: true } });
    const overdue = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Conta fictícia vencida", amountCents: 2000, status: "OVERDUE" }, select: { id: true } });
    const foreign = await admin.financialEntry.create({ data: { arenaId: arenaB.id, type: "REVENUE", category: "GOAL", description: "Conta fictícia de outra arena", amountCents: 3000 }, select: { id: true } });
    entryIds.push(pending.id, overdue.id, foreign.id);

    const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
    const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
    const mocks: Record<string, unknown> = {
      "@prisma/client": { Prisma },
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arenaA.id }) },
      "@/lib/finance/action-schemas": { settlementSchema, bulkEntrySchema },
      "@/lib/finance/inputs": { parseDate, parseMoneyToCents },
      "@/lib/finance/ledger": { getFinancialEntryBalance },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports: actions, Date, FormData, console,
      require: (name: string) => mocks[name] ?? {},
    });
    const settle = (entryId: string, amount: string) => {
      const form = new FormData();
      form.set("entryId", entryId);
      form.set("amount", amount);
      form.set("interest", "0");
      form.set("paymentMethod", "PIX");
      form.set("paidAt", "");
      return actions.settleFinancialEntryAction(form);
    };
    const settleBulk = (ids: string[]) => {
      const form = new FormData();
      ids.forEach((id) => form.append("entryIds", id));
      form.set("paymentMethod", "PIX");
      form.set("paidAt", "");
      return actions.settleFinancialEntriesBulkAction(form);
    };

    await assert.rejects(settle(pending.id, "0"), /maior que zero/);
    await assert.rejects(settle(foreign.id, "10,00"), /não está disponível/);
    await assert.rejects(settleBulk([pending.id, foreign.id]), /Uma ou mais contas não estão disponíveis/);
    assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: pending.id } }), 0);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: pending.id } })).status, "PENDING");

    await settle(overdue.id, "5,00");
    const partlyPaid = await admin.financialEntry.findUniqueOrThrow({ where: { id: overdue.id }, include: { settlements: true } });
    assert.equal(partlyPaid.status, "OVERDUE");
    assert.equal(getFinancialEntryBalance(partlyPaid.amountCents, partlyPaid.settlements).outstandingCents, 1500);
    await settleBulk([overdue.id, pending.id]);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: overdue.id } })).status, "PAID");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: pending.id } })).status, "PAID");
    assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: { in: [overdue.id, pending.id] } } }), 3);
    await assert.rejects(settleBulk([pending.id, foreign.id]), /Uma ou mais contas não estão disponíveis/);
  } finally {
    if (entryIds.length) await admin.financialEntry.deleteMany({ where: { id: { in: entryIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
