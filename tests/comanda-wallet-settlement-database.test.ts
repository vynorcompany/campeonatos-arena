import * as registrationReceivables from "../src/lib/tournaments/registration-receivable";
import { createCardInstallmentEntries } from "../src/lib/finance/card-installment-service";
import { customizedCardInstallments } from "../src/lib/finance/card-installments";
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
import { allocateComandaLines, allocateComandaShares } from "../src/lib/comandas/split";
import { allocatePaymentsToDebts, getOutstandingCents } from "../src/lib/finance/settlements";
import { comandaDebtOwnerId, selectedComandaDebtWhere } from "../src/lib/finance/comanda-debts";
import { cashReferenceDate } from "../src/lib/finance/cash-day";
import { recordCashSaleIfOpen } from "../src/lib/finance/cash-register-sales";

const nodeRequire = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };

async function fixture() {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const limitedUrl = new URL(url); limitedUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: limitedUrl.toString() } } });
  const arena = await admin.arena.create({ data: { name: "Wallet settlement QA", slug: `wallet-${randomUUID()}`, createdById: "goal-test" } });
  const foreign = await admin.arena.create({ data: { name: "Foreign wallet QA", slug: `wallet-foreign-${randomUUID()}`, createdById: "goal-test" } });
  const bank = await admin.bankAccount.create({ data: { arenaId: arena.id, name: "Conta recebimentos QA" } });
  const owner = await admin.player.create({ data: { arenaId: arena.id, name: "Wallet owner QA" } });
  const other = await admin.player.create({ data: { arenaId: arena.id, name: "Other payer QA" } });
  const product = await admin.product.create({ data: { arenaId: arena.id, name: "Service QA", priceCents: 1000, isService: true } });
  await admin.arenaOperationalSettings.create({ data: { arenaId: arena.id, requireFullPayment: true } });
  const transact = (scope: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${scope}, true)`; return operation(tx); }, { maxWait: 10_000, timeout: 10_000 });
  const mocks: Record<string, unknown> = { "@/lib/tournaments/registration-receivable": registrationReceivables, "@/lib/finance/card-installment-service": { createCardInstallmentEntries }, "@/lib/finance/card-installments": { customizedCardInstallments }, "@/lib/products/composition": composition, "@/lib/products/stock-aggregates": { consumeProductStock },
    "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount }, "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arena.id, userId: "goal-test", userName: "Wallet QA" }) },
    "@/lib/arena-database": { arenaDatabase: (scope: string) => arenaDatabaseForTest(runtime, scope) }, "@/lib/rls": { withArenaTransaction: transact },
    "@/lib/comandas/operational-policy": operationalPolicy, "@/lib/comandas/split": { allocateComandaLines, allocateComandaShares }, "@/lib/finance/settlements": { allocatePaymentsToDebts, getOutstandingCents },
    "@/lib/finance/comanda-debts": { comandaDebtOwnerId, selectedComandaDebtWhere }, "@/lib/finance/cash-day": { cashReferenceDate }, "@/lib/finance/cash-register-sales": { recordCashSaleIfOpen },
  };
  const actions: Record<string, (data: FormData) => Promise<unknown>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/comanda.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? (name.startsWith("@/") ? {} : nodeRequire(name)) });
  const command = (withProduct = true) => admin.comanda.create({ data: { arenaId: arena.id, playerId: owner.id, label: owner.name, code: randomUUID(), ...(withProduct ? { items: { create: { productId: product.id, quantity: 1, unitPriceCents: 1000, totalCents: 1000 } } } : {}) } });
  const debt = (amountCents: number, playerId = owner.id, arenaId = arena.id) => admin.financialEntry.create({ data: { arenaId, playerId, type: "REVENUE", category: "Reservas", description: "Wallet debt QA", amountCents, status: "PENDING" } });
  const fund = (amountCents: number) => admin.clientBalanceMovement.create({ data: { arenaId: arena.id, playerId: owner.id, kind: "MONEY", amountCents, reason: "QA initial wallet" } });
  const balance = async () => (await admin.clientBalanceMovement.aggregate({ where: { arenaId: arena.id, playerId: owner.id, kind: "MONEY" }, _sum: { amountCents: true } }))._sum.amountCents ?? 0;
  const finish = (comandaId: string, creditCents: number, debtIds: string[] = [], cashCents = 0, extra: Record<string, string> = {}) => actions.finishComandaAction(form({ comandaId, creditCents: String(creditCents), debtIds: JSON.stringify(debtIds), payments: JSON.stringify(cashCents ? [{ bankAccountId: bank.id, paymentMethod: "PIX", amountCents: cashCents }] : []), ...extra }));
  const booking = async (comandaId: string, amountCents: number) => {
    const entry = await debt(amountCents);
    const occurrence = await admin.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "BOOKING", title: "Reservation wallet QA", bookingTypeName: "Reserva", startsAt: new Date(), endsAt: new Date(Date.now() + 3600000), participants: { create: { playerId: owner.id, amountCents, financialEntryId: entry.id } } }, include: { participants: true } });
    await admin.comandaBookingService.create({ data: { comandaId, participantId: occurrence.participants[0].id } });
    return entry;
  };
  const cleanup = async () => { const ids = [arena.id, foreign.id]; try { await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialSettlement.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialEntry.deleteMany({ where: { arenaId: { in: ids } } }); await admin.sale.deleteMany({ where: { arenaId: { in: ids } } }); await admin.comanda.deleteMany({ where: { arenaId: { in: ids } } }); await admin.arena.deleteMany({ where: { id: { in: ids } } }); } finally { await runtime.$disconnect(); await admin.$disconnect(); } };
  return { admin, bank, arena, foreign, owner, other, command, debt, fund, balance, finish, booking, cleanup, actions };
}

test("command item edits preserve exact prices, audit changes, and reject stale or invalid input", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    const c = await f.command(); const item = await f.admin.comandaItem.findFirstOrThrow({ where: { comandaId: c.id } });
    const edit = (extra: Record<string,string>) => f.actions.editComandaItemAction(form({ itemId: item.id, quantity:"2", unitPriceCents:"1234", expectedQuantity:"1", expectedUnitPriceCents:"1000", ...extra }));
    await edit({}); const saved = await f.admin.comandaItem.findUniqueOrThrow({ where: { id:item.id } });
    assert.equal(saved.unitPriceCents,1234); assert.equal(saved.quantity,2); assert.equal(saved.totalCents,2468);
    assert.equal(await f.admin.auditEvent.count({where:{arenaId:f.arena.id,entityId:c.id,action:"COMANDA_ITEM_UPDATED"}}),1);
    await assert.rejects(edit({unitPriceCents:"1500"}),/alterado por outra/);
    const invalidEdits: Record<string,string>[] = [{quantity:"-1"},{quantity:"1000"},{unitPriceCents:"1.5"},{quantity:"999",unitPriceCents:"2147483647"}];
    for (const extra of invalidEdits) await assert.rejects(edit(extra),/Revise/);
    assert.equal((await f.admin.comandaItem.findUniqueOrThrow({where:{id:item.id}})).totalCents,2468);
    await edit({quantity:"0",expectedQuantity:"2",expectedUnitPriceCents:"1234"});
    assert.equal(await f.admin.comandaItem.count({where:{id:item.id}}),0);
    assert.equal(await f.admin.auditEvent.count({where:{arenaId:f.arena.id,entityId:c.id,action:"COMANDA_ITEM_REMOVED"}}),1);
    assert.equal(await f.admin.sale.count({where:{comandaId:c.id}}),0);
  } finally { await f.cleanup(); }
});

test("command item editing cannot change another arena or a closed command", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    const p=await f.admin.product.create({data:{arenaId:f.foreign.id,name:"Foreign edit QA",priceCents:1000,isService:true}});
    const foreign=await f.admin.comanda.create({data:{arenaId:f.foreign.id,label:"Foreign edit",code:randomUUID(),items:{create:{productId:p.id,quantity:1,unitPriceCents:1000,totalCents:1000}}},include:{items:true}});
    const c=await f.command();const item=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:c.id}});
    const edit=(id:string)=>f.actions.editComandaItemAction(form({itemId:id,quantity:"0",unitPriceCents:"1000",expectedQuantity:"1",expectedUnitPriceCents:"1000"}));
    await assert.rejects(edit(foreign.items[0].id),/não encontrado/);
    await f.finish(c.id,0,[],1000);
    await assert.rejects(edit(item.id),/não encontrado/);
    assert.equal((await f.admin.comandaItem.findUniqueOrThrow({where:{id:item.id}})).totalCents,1000);
    assert.equal((await f.admin.comandaItem.findUniqueOrThrow({where:{id:foreign.items[0].id}})).totalCents,1000);
  } finally { await f.cleanup(); }
});

test("a price edit racing checkout cannot overwrite a closed command or silently charge a new quote", { skip: !isolated }, async () => {
  const f=await fixture();try{
    const c=await f.command();const item=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:c.id}});
    const outcomes=await Promise.allSettled([
      f.actions.editComandaItemAction(form({itemId:item.id,quantity:"1",unitPriceCents:"1200",expectedQuantity:"1",expectedUnitPriceCents:"1000"})),
      f.finish(c.id,0,[],1000,{quotedTotalCents:"1000"})
    ]);
    assert.equal(outcomes.filter(r=>r.status==="fulfilled").length,1);
    const saved=await f.admin.comanda.findUniqueOrThrow({where:{id:c.id},include:{items:true,sale:true}});
    if(saved.status==="CLOSED"){assert.equal(saved.items[0].totalCents,1000);assert.equal(saved.sale?.totalCents,1000);}
    else{assert.equal(saved.items[0].totalCents,1200);assert.equal(saved.sale,null);}
  }finally{await f.cleanup();}
});

test("splitting selected products keeps unselected consumption with the holder and audits the selected lines", { skip: !isolated }, async () => {
  const f=await fixture();try{
    await f.admin.arenaOperationalSettings.update({where:{arenaId:f.arena.id},data:{requireFullPayment:false}});
    const c=await f.command();const chosen=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:c.id}});
    const unselected=await f.admin.product.create({data:{arenaId:f.arena.id,name:"Unselected service QA",priceCents:500,isService:true}});
    await f.admin.comandaItem.create({data:{comandaId:c.id,productId:unselected.id,quantity:1,unitPriceCents:500,totalCents:500}});
    const other=await f.command();const foreignLine=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:other.id}});
    const shares=JSON.stringify([{playerId:f.owner.id,amountCents:800},{playerId:f.other.id,amountCents:700}]);
    await assert.rejects(f.finish(c.id,0,[],0,{shares,splitItemIds:JSON.stringify([foreignLine.id])}),/não estão disponíveis/);
    await assert.rejects(f.finish(c.id,0,[],0,{shares,splitItemIds:JSON.stringify([chosen.id,chosen.id])}),/não estão disponíveis/);
    await assert.rejects(f.finish(c.id,0,[],0,{shares:JSON.stringify([{playerId:f.owner.id,amountCents:400},{playerId:f.other.id,amountCents:1100}]),splitItemIds:JSON.stringify([chosen.id])}),/excedem/);
    assert.equal(await f.admin.sale.count({where:{comandaId:c.id}}),0);
    await f.finish(c.id,0,[],0,{shares,splitItemIds:JSON.stringify([chosen.id])});
    const sale=await f.admin.sale.findUniqueOrThrow({where:{comandaId:c.id}});
    const entries=await f.admin.financialEntry.findMany({where:{saleId:sale.id},orderBy:{amountCents:"asc"}});
    assert.deepEqual(entries.map(e=>[e.playerId,e.amountCents]),[[f.other.id,700],[f.owner.id,800]]);
    const audit=await f.admin.auditEvent.findFirstOrThrow({where:{arenaId:f.arena.id,entityId:c.id,action:"COMANDA_SPLIT"}});
    assert.match(JSON.stringify(audit.details),new RegExp(chosen.id));assert.doesNotMatch(JSON.stringify(audit.details),new RegExp(foreignLine.id));
  }finally{await f.cleanup();}
});

test("wallet alone pays an automatically linked reservation once without a second income entry", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(4000); const c = await f.command(false); const d = await f.booking(c.id, 2500);
    await f.finish(c.id, 2500);
    const paid = await f.admin.financialEntry.findUniqueOrThrow({ where: { id: d.id }, include: { settlements: true } });
    assert.equal(paid.status, "PAID"); assert.equal(paid.settlements.length, 1); assert.equal(paid.settlements[0].paymentMethod, "Saldo do cliente"); assert.equal(paid.settlements[0].amountCents, 2500);
    assert.equal(await f.balance(), 1500); assert.equal((await f.admin.comanda.findUniqueOrThrow({ where: { id: c.id } })).status, "CLOSED");
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: c.id }, include: { payments: true } }); assert.equal(sale.totalCents, 0); assert.equal(sale.payments.length, 0);
    assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, type: { in: ["REVENUE", "INCOME"] }, category: "COMANDAS", status: "PAID" } }), 0);
    await assert.rejects(f.finish(c.id, 2500), /não está disponível/); assert.equal(await f.balance(), 1500);
  } finally { await f.cleanup(); }
});

test("mixed wallet and PIX settle products, debt and existing interest without duplicated income", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(1500); const c = await f.command(); const d = await f.debt(1200);
    await f.admin.financialSettlement.create({ data: { arenaId: f.arena.id, financialEntryId: d.id, amountCents: 200, interestCents: 100, paymentMethod: "PIX", paidAt: new Date() } });
    await f.finish(c.id, 1500, [d.id], 600);
    const paid = await f.admin.financialEntry.findUniqueOrThrow({ where: { id: d.id }, include: { settlements: true } }); assert.equal(paid.status, "PAID"); assert.equal(getOutstandingCents(paid.amountCents, paid.settlements), 0);
    assert.equal(paid.settlements.filter(s => s.paymentMethod === "Saldo do cliente").reduce((sum, s) => sum + s.amountCents, 0), 500);
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: c.id }, include: { payments: true } }); assert.equal(sale.status, "PAID"); assert.equal(sale.payments.reduce((sum, p) => sum + p.amountCents, 0), 1000);
    assert.equal(await f.balance(), 0); assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, type: { in: ["REVENUE", "INCOME"] }, category: "COMANDAS", status: "PAID" } }), 0);
  } finally { await f.cleanup(); }
});

test("wallet pays only the owner's split and debts; it cannot spend on another payer", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(1500); const c = await f.command(); const d = await f.debt(500);
    const shares = JSON.stringify([{ playerId: f.owner.id, amountCents: 400 }, { playerId: f.other.id, amountCents: 600 }]);
    await assert.rejects(f.finish(c.id, 1000, [d.id], 500, { shares }), /excedem/); assert.equal(await f.balance(), 1500);
    await f.finish(c.id, 900, [d.id], 600, { shares }); assert.equal(await f.balance(), 600);
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: c.id }, include: { payments: true } }); assert.equal(sale.payments.find(p => p.paymentMethod === "Saldo do cliente")?.amountCents, 400);
    assert.equal((await f.admin.financialEntry.aggregate({ where: { arenaId: f.arena.id, saleId: sale.id, type: "REVENUE" }, _sum: { amountCents: true } }))._sum.amountCents, 600);
  } finally { await f.cleanup(); }
});

test("concurrent reservation checkouts cannot spend the same wallet twice", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(1000); const a = await f.command(false); const b = await f.command(false); await f.booking(a.id, 1000); await f.booking(b.id, 1000);
    const attempts = await Promise.allSettled([f.finish(a.id, 1000), f.finish(b.id, 1000)]); assert.equal(attempts.filter(r => r.status === "fulfilled").length, 1); assert.equal(await f.balance(), 0);
    assert.equal(await f.admin.comanda.count({ where: { arenaId: f.arena.id, status: "CLOSED" } }), 1);
    assert.equal((await f.admin.financialSettlement.aggregate({ where: { arenaId: f.arena.id }, _sum: { amountCents: true } }))._sum.amountCents, 1000);
  } finally { await f.cleanup(); }
});

test("partial wallet payment preserves the booking debt and refuses forged wallet methods or foreign debts", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(400); const c = await f.command(false); const d = await f.booking(c.id, 1000);
    const otherDebt = await f.debt(200, f.other.id); const foreignPlayer = await f.admin.player.create({ data: { arenaId: f.foreign.id, name: "Foreign wallet owner" } }); const foreignDebt = await f.debt(200, foreignPlayer.id, f.foreign.id);
    await assert.rejects(f.finish(c.id, 400, [otherDebt.id]), /não está disponível/); await assert.rejects(f.finish(c.id, 400, [foreignDebt.id]), /não está disponível/);
    await assert.rejects(f.finish(c.id, 0, [], 0, { payments: JSON.stringify([{ paymentMethod: "Saldo de crédito", amountCents: 1000 }]) }), /ative Usar saldo/);
    assert.equal(await f.balance(), 400); assert.equal(await f.admin.sale.count({ where: { arenaId: f.arena.id } }), 0);
    await f.admin.financialEntry.update({ where: { id: d.id }, data: { onlinePaymentClaimMethod: "PIX", onlinePaymentClaimedAt: new Date() } });
    await assert.rejects(f.finish(c.id, 400), /pagamento online/); assert.equal(await f.balance(), 400);
    await f.admin.financialEntry.update({ where: { id: d.id }, data: { onlinePaymentClaimMethod: "", onlinePaymentClaimedAt: null } });
    await f.admin.arenaOperationalSettings.update({ where: { arenaId: f.arena.id }, data: { requireFullPayment: false } });
    await f.finish(c.id, 400); const entry = await f.admin.financialEntry.findUniqueOrThrow({ where: { id: d.id }, include: { settlements: true } }); assert.equal(getOutstandingCents(entry.amountCents, entry.settlements), 600); assert.equal(await f.balance(), 0);
    assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, type: { in: ["REVENUE", "INCOME"] }, category: "COMANDAS", status: "PAID" } }), 0);
  } finally { await f.cleanup(); }
});

test("comanda validates receiving accounts and preserves each account across debts and product receipts", { skip: !isolated }, async () => {
  const f = await fixture();
  try {
    const command = await f.command();
    const debt = await f.debt(1200);
    const otherBank = await f.admin.bankAccount.create({ data: { arenaId: f.arena.id, name: "Second receiving account QA", active: false } });
    const foreignBank = await f.admin.bankAccount.create({ data: { arenaId: f.foreign.id, name: "Foreign account QA" } });
    const finish = (payments: { paymentMethod: string; amountCents: number; bankAccountId?: string }[]) => f.finish(command.id, 0, [debt.id], 0, { payments: JSON.stringify(payments) });
    await assert.rejects(finish([{ paymentMethod: "PIX", amountCents: 2200 }]), /Selecione a conta bancária/);
    for (const bankAccountId of [foreignBank.id, otherBank.id]) await assert.rejects(finish([{ bankAccountId, paymentMethod: "PIX", amountCents: 2200 }]), /ativa desta arena/);
    assert.equal(await f.admin.sale.count({ where: { comandaId: command.id } }), 0);
    assert.equal(await f.admin.financialSettlement.count({ where: { financialEntryId: debt.id } }), 0);
    assert.equal((await f.admin.comanda.findUniqueOrThrow({ where: { id: command.id } })).status, "OPEN");
    await f.admin.bankAccount.update({ where: { id: otherBank.id }, data: { active: true } });
    await finish([{ bankAccountId: f.bank.id, paymentMethod: "PIX", amountCents: 1000 }, { bankAccountId: otherBank.id, paymentMethod: "Cartão", amountCents: 1200 }]);
    const settlements = await f.admin.financialSettlement.findMany({ where: { financialEntryId: debt.id } });
    assert.equal(settlements.find(row => row.bankAccountId === f.bank.id)?.amountCents, 1000);
    assert.equal(settlements.find(row => row.bankAccountId === otherBank.id)?.amountCents, 200);
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: command.id }, include: { payments: true } });
    assert.equal(sale.payments.length, 1); assert.equal(sale.payments[0].bankAccountId, otherBank.id); assert.equal(sale.payments[0].amountCents, 1000);
    const receipt = await f.admin.financialEntry.findFirstOrThrow({ where: { arenaId: f.arena.id, saleId: sale.id, type: "REVENUE" } });
    assert.equal(receipt.bankAccountId, otherBank.id); assert.equal(receipt.amountCents, 1000);
    assert.equal(receipt.playerId, f.owner.id); assert.equal(receipt.source, "COMANDA"); assert.ok(receipt.dueDate); assert.equal(receipt.status, "PAID");
  } finally { await f.cleanup(); }
});


test("comanda credit installments create monthly receivables once, without cash income", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    const c = await f.command();
    const payments = JSON.stringify([{ bankAccountId: f.bank.id, paymentMethod: "Cartão de crédito", amountCents: 1000, installmentCount: 3, firstDueDate: "2027-01-31" }]);
    await f.finish(c.id, 0, [], 0, { payments });
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: c.id }, include: { payments: true } });
    const entries = await f.admin.financialEntry.findMany({ where: { saleId: sale.id }, orderBy: { dueDate: "asc" } });
    assert.equal(sale.status, "PAID"); assert.equal(sale.payments.reduce((sum, p) => sum + p.amountCents, 0), 1000);
    assert.equal(entries.length, 3); assert.deepEqual(entries.map(e => e.amountCents), [334, 333, 333]);
    assert.deepEqual(entries.map(e => e.dueDate!.toISOString().slice(0,10)), ["2027-01-31", "2027-02-28", "2027-03-31"]);
    assert.ok(entries.every(e => e.status === "PENDING" && e.paidAt === null && e.bankAccountId === f.bank.id && e.playerId === f.owner.id));
    await assert.rejects(f.finish(c.id, 0, [], 0, { payments }), /não está disponível/);
    assert.equal(await f.admin.financialEntry.count({ where: { saleId: sale.id } }), 3);
  } finally { await f.cleanup(); }
});

test("comanda mixes PIX for reservation and installments for products, rejecting debt capitalization", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    const c = await f.command(); const d = await f.booking(c.id, 500);
    const card = { bankAccountId: f.bank.id, paymentMethod: "Cartão de crédito", amountCents: 1500, installmentCount: 3, firstDueDate: "2027-01-10" };
    await assert.rejects(f.finish(c.id, 0, [], 0, { payments: JSON.stringify([card]) }), /reservas e outros débitos/);
    assert.equal((await f.admin.comanda.findUniqueOrThrow({where:{id:c.id}})).status, "OPEN");
    await assert.rejects(f.finish(c.id, 0, [], 0, { payments: JSON.stringify([{...card, firstDueDate:"2027-02-31"}]) }), /primeira parcela/);
    await assert.rejects(f.finish(c.id, 0, [], 0, { payments: JSON.stringify([{...card, paymentMethod:"PIX"}]) }), /somente no cartão/);
    await f.finish(c.id, 0, [], 0, { payments: JSON.stringify([{...card, amountCents:1000}, {bankAccountId:f.bank.id,paymentMethod:"PIX",amountCents:500}]) });
    const paid = await f.admin.financialEntry.findUniqueOrThrow({where:{id:d.id},include:{settlements:true}});
    assert.equal(paid.status,"PAID"); assert.equal(paid.settlements.length,1); assert.equal(paid.settlements[0].amountCents,500);
    const sale = await f.admin.sale.findUniqueOrThrow({where:{comandaId:c.id}});
    assert.equal(await f.admin.financialEntry.count({where:{saleId:sale.id,status:"PAID"}}),0);
    assert.equal(await f.admin.financialEntry.count({where:{saleId:sale.id,status:"PENDING"}}),3);
  } finally { await f.cleanup(); }
});


test("comanda persists customized dates and amounts atomically and rejects a mismatched total", { skip: !isolated }, async () => {
 const f=await fixture();try{
  const c=await f.command();
  const installmentRows=[{dueDate:"2027-01-10",amountCents:500},{dueDate:"2027-03-15",amountCents:200},{dueDate:"2027-04-20",amountCents:300}];
  const card={bankAccountId:f.bank.id,paymentMethod:"Cartão de crédito",amountCents:1000,installmentCount:3,firstDueDate:"2027-01-31",installmentRows};
  await assert.rejects(f.finish(c.id,0,[],0,{payments:JSON.stringify([{...card,installmentRows:[...installmentRows.slice(0,2),{dueDate:"2027-04-20",amountCents:299}]}])}),/soma das parcelas/);
  assert.equal((await f.admin.comanda.findUniqueOrThrow({where:{id:c.id}})).status,"OPEN");
  await f.finish(c.id,0,[],0,{payments:JSON.stringify([card])});
  const sale=await f.admin.sale.findUniqueOrThrow({where:{comandaId:c.id}});
  const rows=await f.admin.financialEntry.findMany({where:{saleId:sale.id},orderBy:{dueDate:"asc"}});
  assert.deepEqual(rows.map(row=>({dueDate:row.dueDate!.toISOString().slice(0,10),amountCents:row.amountCents})),installmentRows);
 }finally{await f.cleanup()}
});

test("paying an event debt with a comanda updates the registration and refuses a second online collection", { skip: !isolated }, async () => {
  const f = await fixture();
  try {
    const event = await f.admin.tournament.create({ data: { arenaId: f.arena.id, name: "Local event debt QA" } });
    const category = await f.admin.tournamentCategory.create({ data: { tournamentId: event.id, name: "Individual", registrationType: "INDIVIDUAL", level: 1 } });
    const registration = await f.admin.publicTournamentRegistration.create({ data: { tournamentId: event.id, categoryId: category.id, registrationOrder: 1, leadPlayerId: f.owner.id, leadName: f.owner.name, leadPhone: "42999990001", leadCpf: "", partnerName: "", partnerPhone: "", partnerCpf: "", amountCents: 7500, paymentProvider: "PAY_ON_SITE", paymentStatus: "PENDING", status: "CONFIRMED" } });
    const debt = await f.admin.$transaction(tx => registrationReceivables.ensureTournamentRegistrationReceivable(tx, f.arena.id, registration.id)); assert.ok(debt);
    await f.fund(7500); const command = await f.command(false);
    await f.finish(command.id, 7500, [debt.id]);
    assert.equal((await f.admin.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "PAID");
    assert.equal((await f.admin.financialEntry.findUniqueOrThrow({ where: { id: debt.id } })).status, "PAID");
    assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, externalReference: registration.id } }), 1);
    const online = await f.admin.publicTournamentRegistration.create({ data: { tournamentId: event.id, categoryId: category.id, registrationOrder: 2, leadName: "Online QA", leadPhone: "42999990002", leadCpf: "", partnerName: "", partnerPhone: "", partnerCpf: "", amountCents: 7500, paymentProvider: "MERCADO_PAGO", status: "PENDING_PAYMENT" } });
    const onlineDebt = await f.admin.$transaction(tx => registrationReceivables.ensureTournamentRegistrationReceivable(tx, f.arena.id, online.id)); assert.ok(onlineDebt);
    const second = await f.command(false);
    await assert.rejects(f.finish(second.id, 0, [onlineDebt.id], 7500), /cobrança online/);
    assert.equal(await f.admin.financialSettlement.count({ where: { financialEntryId: onlineDebt.id } }), 0);
  } finally { await f.cleanup(); }
});

test("total discount settles reservation and products once, records original amounts and excludes unrelated debts", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    const c = await f.command(); const booking = await f.booking(c.id, 3000); const oldDebt = await f.debt(500);
    await f.finish(c.id, 0, [oldDebt.id], 3500, { discountMode: "TOTAL", discountCents: "1000", quotedTotalCents: "4500" });
    const paid = await f.admin.financialEntry.findUniqueOrThrow({ where: { id: booking.id }, include: { settlements: true } });
    assert.equal(paid.amountCents, 3000); assert.equal(paid.status, "PAID");
    assert.equal(paid.settlements.reduce((s,r)=>s+r.discountCents,0),750);
    assert.equal(paid.settlements.reduce((s,r)=>s+r.amountCents,0),2250);
    assert.equal(getOutstandingCents(paid.amountCents, paid.settlements),0);
    const old = await f.admin.financialEntry.findUniqueOrThrow({ where: { id: oldDebt.id }, include: { settlements: true } });
    assert.equal(old.status,"PAID"); assert.equal(old.settlements.reduce((s,r)=>s+r.discountCents,0),0);
    const sale = await f.admin.sale.findUniqueOrThrow({where:{comandaId:c.id},include:{items:true,payments:true}});
    assert.equal(sale.totalCents,750); assert.equal(sale.items[0].discountCents,250); assert.equal(sale.items[0].unitPriceCents,1000); assert.equal(sale.items[0].totalCents,750);
    assert.equal(sale.payments.reduce((s,r)=>s+r.amountCents,0),750);
    assert.equal(await f.admin.auditEvent.count({where:{entityId:c.id,action:"COMANDA_DISCOUNT_APPLIED"}}),1);
    await assert.rejects(f.finish(c.id,0,[],3500,{discountCents:"1000"}),/não está disponível/);
    assert.equal(await f.admin.financialEntry.count({where:{arenaId:f.arena.id,amountCents:3000}}),1);
  } finally { await f.cleanup(); }
});

test("per-item discounts independently adjust products and a reservation; 100% discounts settle with no fictitious cash", { skip: !isolated }, async()=>{
 const f=await fixture();try{
  const c=await f.command();const d=await f.booking(c.id,2500);
  const item=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:c.id}});
  await f.finish(c.id,0,[],0,{discountMode:"ITEMS",itemDiscounts:JSON.stringify([{kind:"ITEM",id:item.id,amountCents:1000},{kind:"DEBT",id:d.id,amountCents:2500}]),allowEmpty:"true"});
  const e=await f.admin.financialEntry.findUniqueOrThrow({where:{id:d.id},include:{settlements:true}});
  assert.equal(e.status,"PAID");assert.equal(e.settlements.length,1);assert.equal(e.settlements[0].amountCents,0);assert.equal(e.settlements[0].discountCents,2500);
  const sale=await f.admin.sale.findUniqueOrThrow({where:{comandaId:c.id},include:{payments:true,items:true}});assert.equal(sale.status,"PAID");assert.equal(sale.totalCents,0);assert.equal(sale.payments.length,0);
  assert.equal(sale.items[0].discountCents,1000);assert.equal((await f.admin.comandaItem.findUniqueOrThrow({where:{id:item.id}})).totalCents,0);
  assert.equal(await f.admin.financialEntry.count({where:{arenaId:f.arena.id,category:"COMANDAS"}}),0);
 }finally{await f.cleanup();}
});

test("discount cannot target a foreign item or unrelated debt, exceed a line, accumulate modes or use a stale quote", {skip:!isolated},async()=>{
 const f=await fixture();try{
  const c=await f.command();const d=await f.booking(c.id,1000);const old=await f.debt(500);
  const item=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:c.id}});
  const invalidDiscounts: Record<string,string>[] = [
   {discountMode:"ITEMS",itemDiscounts:JSON.stringify([{kind:"ITEM",id:"foreign-item",amountCents:1}])},
   {discountMode:"ITEMS",itemDiscounts:JSON.stringify([{kind:"DEBT",id:old.id,amountCents:1}])},
   {discountCents:"2001"},
   {discountMode:"ITEMS",itemDiscounts:JSON.stringify([{kind:"ITEM",id:item.id,amountCents:1001}])},
   {discountMode:"ITEMS",discountCents:"1"},
   {discountCents:"1",quotedTotalCents:"1999"},
  ];
  for(const extra of invalidDiscounts) await assert.rejects(f.finish(c.id,0,[],1999,extra));
  assert.equal(await f.admin.sale.count({where:{comandaId:c.id}}),0);
  assert.equal(await f.admin.financialSettlement.count({where:{financialEntryId:d.id}}),0);
  assert.equal((await f.admin.comanda.findUniqueOrThrow({where:{id:c.id}})).status,"OPEN");
 }finally{await f.cleanup();}
});

test("discount combines with partial payment and client credit while preserving net outstanding balances",{skip:!isolated},async()=>{
 const f=await fixture();try{
  await f.fund(500);const c=await f.command();const d=await f.booking(c.id,3000);
  await f.finish(c.id,500,[],1000,{discountCents:"1000",allowPartial:"true"});
  const paid=await f.admin.financialEntry.findUniqueOrThrow({where:{id:d.id},include:{settlements:true}});
  assert.equal(paid.settlements.reduce((s,r)=>s+r.discountCents,0),750);
  assert.equal(getOutstandingCents(paid.amountCents,paid.settlements),1250);
  assert.equal(paid.status,"PENDING");assert.equal(await f.balance(),0);
  const sale=await f.admin.sale.findUniqueOrThrow({where:{comandaId:c.id}});assert.equal(sale.totalCents,750);
  assert.equal((await f.admin.financialEntry.aggregate({where:{arenaId:f.arena.id,saleId:sale.id,status:"PENDING"},_sum:{amountCents:true}}))._sum.amountCents,250);
 }finally{await f.cleanup();}
});

test("full split distributes linked reservations without creating cash and retains prior payments", {skip:!isolated}, async()=>{
 const f=await fixture();try{
  const c=await f.command();const booking=await f.booking(c.id,6000);
  await f.admin.financialSettlement.create({data:{arenaId:f.arena.id,financialEntryId:booking.id,amountCents:1000,paymentMethod:"PIX"}});
  await f.admin.financialEntry.update({where:{id:booking.id},data:{status:"PARTIAL"}});
  await f.finish(c.id,0,[],0,{allowPartial:"true",splitIncludesBookings:"true",shares:JSON.stringify([{playerId:f.owner.id,amountCents:3000},{playerId:f.other.id,amountCents:3000}])});
  const parent=await f.admin.financialEntry.findUniqueOrThrow({where:{id:booking.id},include:{reservationSplitParts:true,settlements:true}});
  assert.equal(parent.amountCents,3500);assert.equal(parent.reservationSplitParts.length,1);assert.equal(parent.reservationSplitParts[0].amountCents,2500);assert.equal(parent.reservationSplitParts[0].playerId,f.other.id);
  assert.equal(parent.settlements.reduce((n,r)=>n+r.amountCents,0),1000);
  const outstanding=await f.admin.financialEntry.findMany({where:{arenaId:f.arena.id,status:{in:["PENDING","PARTIAL"]}},include:{settlements:true}});
  assert.equal(outstanding.reduce((n,r)=>n+getOutstandingCents(r.amountCents,r.settlements),0),6000);
  assert.equal(await f.admin.financialSettlement.count({where:{arenaId:f.arena.id}}),1);
 }finally{await f.cleanup();}
});

test("split partial receipts pay holder products and reservation before other clients", {skip:!isolated},async()=>{
 const f=await fixture();try{
  const c=await f.command();const booking=await f.booking(c.id,5000);
  await f.finish(c.id,0,[],3000,{allowPartial:"true",splitIncludesBookings:"true",shares:JSON.stringify([{playerId:f.owner.id,amountCents:3000},{playerId:f.other.id,amountCents:3000}])});
  const entries=await f.admin.financialEntry.findMany({where:{arenaId:f.arena.id},include:{settlements:true}});
  const ownOutstanding=entries.filter(r=>r.playerId===f.owner.id && ["PARTIAL","PENDING"].includes(r.status)).reduce((n,r)=>n+getOutstandingCents(r.amountCents,r.settlements),0);
  const otherOutstanding=entries.filter(r=>r.playerId===f.other.id && ["PARTIAL","PENDING"].includes(r.status)).reduce((n,r)=>n+getOutstandingCents(r.amountCents,r.settlements),0);
  assert.equal(ownOutstanding,0);assert.equal(otherOutstanding,3000);
  assert.equal(entries.find(r=>r.id===booking.id)?.status,"PAID");
  assert.equal(entries.filter(r=>r.status==="PAID" && r.source==="COMANDA").reduce((n,r)=>n+r.amountCents,0)+entries.flatMap(r=>r.settlements).reduce((n,r)=>n+r.amountCents,0),3000);
 }finally{await f.cleanup();}
});

test("selected product split keeps reservation entirely with holder",{skip:!isolated},async()=>{
 const f=await fixture();try{
  const c=await f.command();const booking=await f.booking(c.id,5000);const item=await f.admin.comandaItem.findFirstOrThrow({where:{comandaId:c.id}});
  await f.finish(c.id,0,[],0,{allowPartial:"true",splitIncludesBookings:"true",splitItemIds:JSON.stringify([item.id]),shares:JSON.stringify([{playerId:f.owner.id,amountCents:5500},{playerId:f.other.id,amountCents:500}])});
  assert.equal(await f.admin.financialEntry.count({where:{reservationSplitParentId:booking.id}}),0);
  assert.equal((await f.admin.financialEntry.findUniqueOrThrow({where:{id:booking.id}})).amountCents,5000);
 }finally{await f.cleanup();}
});

test("reservation-only split uses wallet solely on holder and retains real cash totals",{skip:!isolated},async()=>{
 const f=await fixture();try{
  const c=await f.command(false);const booking=await f.booking(c.id,5001);await f.fund(2501);
  await f.finish(c.id,2501,[],0,{allowPartial:"true",splitIncludesBookings:"true",shares:JSON.stringify([{playerId:f.owner.id,amountCents:2501},{playerId:f.other.id,amountCents:2500}])});
  const parent=await f.admin.financialEntry.findUniqueOrThrow({where:{id:booking.id},include:{reservationSplitParts:{include:{settlements:true}},settlements:true}});
  assert.equal(parent.status,"PAID");assert.equal(parent.reservationSplitParts[0].status,"PENDING");
  assert.equal(parent.reservationSplitParts[0].settlements.length,0);assert.equal(parent.settlements[0].paymentMethod,"Saldo do cliente");assert.equal(await f.balance(),0);
  assert.equal(await f.admin.financialEntry.count({where:{arenaId:f.arena.id,category:"COMANDAS",status:"PAID"}}),0);
 }finally{await f.cleanup();}
});

test("reservation split with total discount and full cash preserves original price minus discount",{skip:!isolated},async()=>{
 const f=await fixture();try{
  const c=await f.command();const booking=await f.booking(c.id,5000);
  await f.finish(c.id,0,[],4800,{discountCents:"1200",splitIncludesBookings:"true",shares:JSON.stringify([{playerId:f.owner.id,amountCents:2400},{playerId:f.other.id,amountCents:2400}])});
  const parent=await f.admin.financialEntry.findUniqueOrThrow({where:{id:booking.id},include:{reservationSplitParts:{include:{settlements:true}},settlements:true}});
  assert.equal(parent.status,"PAID");assert.equal(parent.reservationSplitParts[0].status,"PAID");
  const bookingCash=[...parent.settlements,...parent.reservationSplitParts.flatMap(p=>p.settlements)].reduce((n,r)=>n+r.amountCents,0);
  assert.equal(bookingCash,4000);assert.equal(parent.settlements.reduce((n,r)=>n+r.discountCents,0),1000);
  assert.equal(parent.amountCents+parent.reservationSplitParts.reduce((n,p)=>n+p.amountCents,0),5000);
 }finally{await f.cleanup();}
});

test("invalid payer cannot transfer any booking balance and cross-arena split relation is rejected",{skip:!isolated},async()=>{
 const f=await fixture();try{
  const c=await f.command(false);const booking=await f.booking(c.id,5000);
  const foreignPlayer=await f.admin.player.create({data:{arenaId:f.foreign.id,name:"Foreign"}});
  await assert.rejects(f.finish(c.id,0,[],0,{allowPartial:"true",splitIncludesBookings:"true",shares:JSON.stringify([{playerId:f.owner.id,amountCents:2500},{playerId:foreignPlayer.id,amountCents:2500}])}),/nesta arena/);
  assert.equal((await f.admin.financialEntry.findUniqueOrThrow({where:{id:booking.id}})).amountCents,5000);
  assert.equal(await f.admin.financialEntry.count({where:{reservationSplitParentId:booking.id}}),0);
  await assert.rejects(f.admin.financialEntry.create({data:{arenaId:f.foreign.id,playerId:foreignPlayer.id,reservationSplitParentId:booking.id,type:"REVENUE",category:"QA",description:"Invalid",amountCents:1}}));
 }finally{await f.cleanup();}
});
