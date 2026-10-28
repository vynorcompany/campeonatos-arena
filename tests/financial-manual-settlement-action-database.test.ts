import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { Prisma, PrismaClient } from "@prisma/client";
import ts from "typescript";
import { bulkEntrySchema, settlementSchema } from "../src/lib/finance/action-schemas";
import { parseDate, parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { financialEntryPermission } from "../src/lib/finance/entry-permissions";

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
  let checkoutId = "";
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const pending = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Conta fictícia pendente", amountCents: 1000 }, select: { id: true } });
    const overdue = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Conta fictícia vencida", amountCents: 2000, status: "OVERDUE" }, select: { id: true } });
    const foreign = await admin.financialEntry.create({ data: { arenaId: arenaB.id, type: "REVENUE", category: "GOAL", description: "Conta fictícia de outra arena", amountCents: 3000 }, select: { id: true } });
    const online = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Cobrança online fictícia", amountCents: 1000, onlinePaymentId: "goal-provider-payment" }, select: { id: true } });
    const grouped = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Checkout agrupado fictício", amountCents: 1000 }, select: { id: true } });
    const claimed = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Emissão incerta fictícia", amountCents: 1000, onlinePaymentClaimMethod: "BOLETO" }, select: { id: true } });
    entryIds.push(pending.id, overdue.id, foreign.id, online.id, grouped.id, claimed.id);
    checkoutId = (await admin.onlinePaymentCheckout.create({ data: {
      arenaId: arenaA.id, playerId: "goal-athlete-a", amountCents: 1000,
      items: { create: [{ financialEntryId: grouped.id, amountCents: 1000 }] },
    }, select: { id: true } })).id;

    const source = readFileSync(new URL("../src/lib/actions/finance.ts", import.meta.url), "utf8");
    const actions: Record<string, (form: FormData) => Promise<unknown>> = {};
    const mocks: Record<string, unknown> = {
      "@prisma/client": { Prisma },
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arenaA.id }) },
      "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId: arenaA.id }) },
      "@/lib/permissions": { canPerformPermission: () => true },
      "@/lib/finance/entry-permissions": { financialEntryPermission },
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
    const settle = (entryId: string, amount: string, discount = "0", discountMode = "AMOUNT") => {
      const form = new FormData();
      form.set("entryId", entryId);
      form.set("amount", amount);
      form.set("discount", discount); form.set("discountMode", discountMode);
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
    await assert.rejects(settle(online.id, "10,00"), /cobrança online/);
    await assert.rejects(settle(claimed.id, "10,00"), /cobrança online/);
    await assert.rejects(settle(grouped.id, "10,00"), /cobrança online/);
    await assert.rejects(settleBulk([pending.id, grouped.id]), /cobrança online/);
    assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: pending.id } }), 0);
    assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: grouped.id } }), 0);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: pending.id } })).status, "PENDING");
    await admin.onlinePaymentCheckout.update({ where: { id: checkoutId }, data: { status: "FAILED", mercadoPagoPaymentId: "goal-failed-payment" } });
    await assert.rejects(settle(grouped.id, "10,00"), /cobrança online/);
    await admin.onlinePaymentCheckout.update({ where: { id: checkoutId }, data: { mercadoPagoPaymentId: "" } });
    await settle(grouped.id, "10,00");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: grouped.id } })).status, "PAID");

    await settle(overdue.id, "5,00");
    const partlyPaid = await admin.financialEntry.findUniqueOrThrow({ where: { id: overdue.id }, include: { settlements: true } });
    assert.equal(partlyPaid.status, "OVERDUE");
    assert.equal(getFinancialEntryBalance(partlyPaid.amountCents, partlyPaid.settlements).outstandingCents, 1500);
    const discounted = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Desconto fictício", amountCents: 10000 } }); entryIds.push(discounted.id);
    await assert.rejects(settle(discounted.id, "1,00", "101", "PERCENTAGE"), /desconto válido/);
    await settle(discounted.id, "40,00", "10", "PERCENTAGE");
    const partial = await admin.financialEntry.findUniqueOrThrow({ where: { id: discounted.id }, include: { settlements: true } });
    assert.equal(partial.amountCents, 10000);
    assert.equal(partial.settlements[0].discountCents, 1000);
    assert.equal(partial.settlements[0].amountCents, 4000);
    assert.equal(getFinancialEntryBalance(partial.amountCents, partial.settlements).outstandingCents, 5000);
    await settle(discounted.id, "45,00", "5,00");
    const complete = await admin.financialEntry.findUniqueOrThrow({ where: { id: discounted.id }, include: { settlements: true } });
    assert.equal(complete.status, "PAID");
    assert.equal(complete.settlements.reduce((sum, row) => sum + row.amountCents, 0), 8500);
    assert.equal(getFinancialEntryBalance(complete.amountCents, complete.settlements).outstandingCents, 0);
    const waived = await admin.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Desconto integral fictício", amountCents: 1000 } }); entryIds.push(waived.id);
    await settle(waived.id, "0,00", "100", "PERCENTAGE");
    const waiver = await admin.financialEntry.findUniqueOrThrow({ where: { id: waived.id }, include: { settlements: true } });
    assert.equal(waiver.status, "PAID"); assert.equal(waiver.settlements[0].amountCents, 0); assert.equal(waiver.settlements[0].discountCents, 1000);
    await settleBulk([overdue.id, pending.id]);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: overdue.id } })).status, "PAID");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: pending.id } })).status, "PAID");
    assert.equal(await admin.financialSettlement.count({ where: { financialEntryId: { in: [overdue.id, pending.id] } } }), 3);
    await assert.rejects(settleBulk([pending.id, foreign.id]), /Uma ou mais contas não estão disponíveis/);
  } finally {
    if (checkoutId) await admin.onlinePaymentCheckout.delete({ where: { id: checkoutId } });
    if (entryIds.length) await admin.financialEntry.deleteMany({ where: { id: { in: entryIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
