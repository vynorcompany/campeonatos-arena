import * as composition from "../src/lib/products/composition";
import { consumeProductStock } from "../src/lib/products/stock-aggregates";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import * as operationalPolicy from "../src/lib/comandas/operational-policy";
import { allocateComandaShares } from "../src/lib/comandas/split";
import { allocatePaymentsToDebts, getOutstandingCents } from "../src/lib/finance/settlements";
import { comandaDebtOwnerId, selectedComandaDebtWhere } from "../src/lib/finance/comanda-debts";
import { cashReferenceDate } from "../src/lib/finance/cash-day";
import { recordCashSaleIfOpen } from "../src/lib/finance/cash-register-sales";

const nodeRequire = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("comanda policies enforce delinquency, cash, full payment, surplus, wallet concurrency and card reuse", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } }); const arenas: string[] = [];
  try {
    const arena = await admin.arena.create({ data: { slug: `comanda-policy-${randomUUID()}`, name: "Comanda policies QA", createdById: "goal-test" } }); arenas.push(arena.id);
    const foreign = await admin.arena.create({ data: { slug: `comanda-foreign-${randomUUID()}`, name: "Other policies QA", createdById: "goal-test" } }); arenas.push(foreign.id);
    const bank = await admin.bankAccount.create({ data: { arenaId: arena.id, name: "Conta recebimentos QA" } });
    const player = await admin.player.create({ data: { arenaId: arena.id, name: "Policy customer QA" } });
    const other = await admin.player.create({ data: { arenaId: foreign.id, name: "Foreign policy customer QA" } });
    const product = await admin.product.create({ data: { arenaId: arena.id, name: "Service QA", isService: true, priceCents: 1000 } });
    const settings = await admin.arenaOperationalSettings.create({ data: { arenaId: arena.id, requireFullPayment: true, cashRegisterRequired: true, blockDelinquentComandas: true, comandaCardsEnabled: true } });
    const transact = <T>(arenaId: string, operation: Parameters<PrismaClient["$transaction"]>[0]) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return (operation as (tx: unknown) => Promise<T>)(tx); });
    const mocks: Record<string, unknown> = { "@/lib/products/composition": composition, "@/lib/products/stock-aggregates": { consumeProductStock },
      "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount }, "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arena.id, userId: "goal-test", userName: "Policy operator QA" }) },
      "@/lib/arena-database": { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) }, "@/lib/rls": { withArenaTransaction: transact },
      "@/lib/comandas/operational-policy": operationalPolicy, "@/lib/comandas/split": { allocateComandaShares }, "@/lib/finance/settlements": { allocatePaymentsToDebts, getOutstandingCents },
      "@/lib/finance/comanda-debts": { comandaDebtOwnerId, selectedComandaDebtWhere }, "@/lib/finance/cash-day": { cashReferenceDate }, "@/lib/finance/cash-register-sales": { recordCashSaleIfOpen },
    };
    const actions: Record<string, (form: FormData) => Promise<any>> = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/comanda.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? (name.startsWith("@/") ? {} : nodeRequire(name)) });
    const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
    const open = (cardNumber?: string, playerId = player.id) => actions.createComandaAction(form({ type: "CLIENT", playerId, ...(cardNumber ? { cardNumber } : {}) }));
    const finish = (id: string, amount: number, extra: Record<string, string> = {}) => actions.finishComandaAction(form({ comandaId: id, payments: JSON.stringify(amount ? [{ bankAccountId: bank.id, paymentMethod: "PIX", amountCents: amount }] : []), debtIds: "[]", ...extra }));
    const createBill = () => admin.comanda.create({ data: { arenaId: arena.id, playerId: player.id, label: player.name, code: `POLICY-${randomUUID()}`, items: { create: { productId: product.id, quantity: 1, unitPriceCents: 1000, totalCents: 1000 } } } });
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 2);
    const debt = await admin.financialEntry.create({ data: { arenaId: arena.id, playerId: player.id, type: "REVENUE", category: "QA", description: "Overdue QA", amountCents: 1000, dueDate: yesterday, status: "PARTIAL" } });
    await assert.rejects(open(), /vencidos/);
    await admin.financialSettlement.create({ data: { arenaId: arena.id, financialEntryId: debt.id, amountCents: 1000, paymentMethod: "PIX", paidAt: new Date() } });
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
    await admin.financialEntry.create({ data: { arenaId: arena.id, playerId: player.id, type: "REVENUE", category: "QA", description: "Future QA", amountCents: 1000, dueDate: tomorrow, status: "PENDING" } });
    const opened = await open("QA-01"); assert.ok(opened.comandaId);
    await assert.rejects(actions.createComandaAction(form({ type: "AVULSA", label: "Different owner", cardNumber: "qa-01" })), /cartão já está em uso/);
    await finish(opened.comandaId, 0, { allowEmpty: "true" });
    const reusedCard = await actions.createComandaAction(form({ type: "AVULSA", label: "Reusable card QA", cardNumber: "QA-01" })); assert.ok(reusedCard.comandaId);
    await assert.rejects(open(undefined, other.id), /Cliente não encontrado/);
    const bill = await createBill();
    await assert.rejects(finish(bill.id, 600), /quitação integral/);
    await assert.rejects(finish(bill.id, 1000), /Abra o caixa/);
    assert.equal(await admin.sale.count({ where: { comandaId: bill.id } }), 0);
    await admin.cashRegister.create({ data: { arenaId: arena.id, referenceDate: cashReferenceDate(new Date()) } });
    await assert.rejects(finish(bill.id, 1200), /ultrapassar/);
    await admin.arenaOperationalSettings.update({ where: { id: settings.id }, data: { preventOverpayment: false } });
    await finish(bill.id, 1200);
    assert.equal((await admin.sale.findUniqueOrThrow({ where: { comandaId: bill.id } })).totalCents, 1000);
    assert.equal((await admin.clientBalanceMovement.aggregate({ where: { arenaId: arena.id, playerId: player.id }, _sum: { amountCents: true } }))._sum.amountCents, 200);
    assert.equal((await admin.financialEntry.aggregate({ where: { arenaId: arena.id, description: { contains: bill.code } }, _sum: { amountCents: true } }))._sum.amountCents, 1200);
    const partial = await createBill(); await finish(partial.id, 600, { allowPartial: "true" });
    assert.equal(await admin.auditEvent.count({ where: { arenaId: arena.id, action: "COMANDA_PARTIAL_PAYMENT_OVERRIDE", entityId: partial.id } }), 1);
    const first = await createBill(); const second = await createBill();
    const attempts = await Promise.allSettled([finish(first.id, 800, { creditCents: "200" }), finish(second.id, 800, { creditCents: "200" })]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await admin.clientBalanceMovement.aggregate({ where: { arenaId: arena.id, playerId: player.id }, _sum: { amountCents: true } }))._sum.amountCents, 0);
    const soda = await admin.product.create({data:{arenaId:arena.id,name:"Ingrediente fiscal QA",stockQuantity:10,fiscalProfile:{ncm:"22021000"}}});
    const drink = await admin.product.create({data:{arenaId:arena.id,name:"Composto fiscal QA",stockQuantity:10,priceCents:1000,fiscalProfile:{ncm:"22089000",icmsCode:"102"},stockAggregates:[{productId:soda.id,quantity:1}]}});
    const fiscalBill=await admin.comanda.create({data:{arenaId:arena.id,playerId:player.id,label:player.name,code:`FISCAL-${randomUUID()}`,items:{create:{productId:drink.id,quantity:1,unitPriceCents:1000,totalCents:1000,stockRecipe:[{productId:soda.id,quantity:1}]}}}});
    await finish(fiscalBill.id,1000);
    const fiscalSale=await admin.sale.findUniqueOrThrow({where:{comandaId:fiscalBill.id},include:{items:true}});
    assert.equal(fiscalSale.items.length,1,"Ingrediente não vira um segundo item cobrado na nota");
    assert.equal((fiscalSale.items[0].fiscalProfile as Record<string,string>).ncm,"22089000");
    assert.equal((await admin.product.findUniqueOrThrow({where:{id:soda.id}})).stockQuantity,9);
    await admin.product.update({where:{id:drink.id},data:{fiscalProfile:{ncm:"21069090"}}});
    assert.equal(((await admin.saleItem.findUniqueOrThrow({where:{id:fiscalSale.items[0].id}})).fiscalProfile as Record<string,string>).ncm,"22089000","Alterar cadastro não reescreve o histórico fiscal da venda");
  } finally { await admin.sale.deleteMany({ where: { arenaId: { in: arenas } } }); await admin.comanda.deleteMany({ where: { arenaId: { in: arenas } } }); await admin.financialEntry.deleteMany({ where: { arenaId: { in: arenas } } }); await admin.arena.deleteMany({ where: { id: { in: arenas } } }); await runtime.$disconnect(); await admin.$disconnect(); }
});
