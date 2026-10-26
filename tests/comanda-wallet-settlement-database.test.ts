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
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };

async function fixture() {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const limitedUrl = new URL(url); limitedUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: limitedUrl.toString() } } });
  const arena = await admin.arena.create({ data: { name: "Wallet settlement QA", slug: `wallet-${randomUUID()}`, createdById: "goal-test" } });
  const foreign = await admin.arena.create({ data: { name: "Foreign wallet QA", slug: `wallet-foreign-${randomUUID()}`, createdById: "goal-test" } });
  const owner = await admin.player.create({ data: { arenaId: arena.id, name: "Wallet owner QA" } });
  const other = await admin.player.create({ data: { arenaId: arena.id, name: "Other payer QA" } });
  const product = await admin.product.create({ data: { arenaId: arena.id, name: "Service QA", priceCents: 1000, isService: true } });
  await admin.arenaOperationalSettings.create({ data: { arenaId: arena.id, requireFullPayment: true } });
  const transact = (scope: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${scope}, true)`; return operation(tx); }, { maxWait: 10_000, timeout: 10_000 });
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arena.id, userId: "goal-test", userName: "Wallet QA" }) },
    "@/lib/arena-database": { arenaDatabase: (scope: string) => arenaDatabaseForTest(runtime, scope) }, "@/lib/rls": { withArenaTransaction: transact },
    "@/lib/comandas/operational-policy": operationalPolicy, "@/lib/comandas/split": { allocateComandaShares }, "@/lib/finance/settlements": { allocatePaymentsToDebts, getOutstandingCents },
    "@/lib/finance/comanda-debts": { comandaDebtOwnerId, selectedComandaDebtWhere }, "@/lib/finance/cash-day": { cashReferenceDate }, "@/lib/finance/cash-register-sales": { recordCashSaleIfOpen },
  };
  const actions: Record<string, (data: FormData) => Promise<unknown>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/comanda.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? (name.startsWith("@/") ? {} : nodeRequire(name)) });
  const command = (withProduct = true) => admin.comanda.create({ data: { arenaId: arena.id, playerId: owner.id, label: owner.name, code: randomUUID(), ...(withProduct ? { items: { create: { productId: product.id, quantity: 1, unitPriceCents: 1000, totalCents: 1000 } } } : {}) } });
  const debt = (amountCents: number, playerId = owner.id, arenaId = arena.id) => admin.financialEntry.create({ data: { arenaId, playerId, type: "REVENUE", category: "Reservas", description: "Wallet debt QA", amountCents, status: "PENDING" } });
  const fund = (amountCents: number) => admin.clientBalanceMovement.create({ data: { arenaId: arena.id, playerId: owner.id, kind: "MONEY", amountCents, reason: "QA initial wallet" } });
  const balance = async () => (await admin.clientBalanceMovement.aggregate({ where: { arenaId: arena.id, playerId: owner.id, kind: "MONEY" }, _sum: { amountCents: true } }))._sum.amountCents ?? 0;
  const finish = (comandaId: string, creditCents: number, debtIds: string[] = [], cashCents = 0, extra: Record<string, string> = {}) => actions.finishComandaAction(form({ comandaId, creditCents: String(creditCents), debtIds: JSON.stringify(debtIds), payments: JSON.stringify(cashCents ? [{ paymentMethod: "PIX", amountCents: cashCents }] : []), ...extra }));
  const booking = async (comandaId: string, amountCents: number) => {
    const entry = await debt(amountCents);
    const occurrence = await admin.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "BOOKING", title: "Reservation wallet QA", bookingTypeName: "Reserva", startsAt: new Date(), endsAt: new Date(Date.now() + 3600000), participants: { create: { playerId: owner.id, amountCents, financialEntryId: entry.id } } }, include: { participants: true } });
    await admin.comandaBookingService.create({ data: { comandaId, participantId: occurrence.participants[0].id } });
    return entry;
  };
  const cleanup = async () => { const ids = [arena.id, foreign.id]; try { await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialSettlement.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialEntry.deleteMany({ where: { arenaId: { in: ids } } }); await admin.sale.deleteMany({ where: { arenaId: { in: ids } } }); await admin.comanda.deleteMany({ where: { arenaId: { in: ids } } }); await admin.arena.deleteMany({ where: { id: { in: ids } } }); } finally { await runtime.$disconnect(); await admin.$disconnect(); } };
  return { admin, arena, foreign, owner, other, command, debt, fund, balance, finish, booking, cleanup };
}

test("wallet alone pays an automatically linked reservation once without a second income entry", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(4000); const c = await f.command(false); const d = await f.booking(c.id, 2500);
    await f.finish(c.id, 2500);
    const paid = await f.admin.financialEntry.findUniqueOrThrow({ where: { id: d.id }, include: { settlements: true } });
    assert.equal(paid.status, "PAID"); assert.equal(paid.settlements.length, 1); assert.equal(paid.settlements[0].paymentMethod, "Saldo do cliente"); assert.equal(paid.settlements[0].amountCents, 2500);
    assert.equal(await f.balance(), 1500); assert.equal((await f.admin.comanda.findUniqueOrThrow({ where: { id: c.id } })).status, "CLOSED");
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: c.id }, include: { payments: true } }); assert.equal(sale.totalCents, 0); assert.equal(sale.payments.length, 0);
    assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, type: "INCOME" } }), 0);
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
    assert.equal(await f.balance(), 0); assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, type: "INCOME" } }), 0);
  } finally { await f.cleanup(); }
});

test("wallet pays only the owner's split and debts; it cannot spend on another payer", { skip: !isolated }, async () => {
  const f = await fixture(); try {
    await f.fund(1500); const c = await f.command(); const d = await f.debt(500);
    const shares = JSON.stringify([{ playerId: f.owner.id, amountCents: 400 }, { playerId: f.other.id, amountCents: 600 }]);
    await assert.rejects(f.finish(c.id, 1000, [d.id], 500, { shares }), /excedem/); assert.equal(await f.balance(), 1500);
    await f.finish(c.id, 900, [d.id], 600, { shares }); assert.equal(await f.balance(), 600);
    const sale = await f.admin.sale.findUniqueOrThrow({ where: { comandaId: c.id }, include: { payments: true } }); assert.equal(sale.payments.find(p => p.paymentMethod === "Saldo do cliente")?.amountCents, 400);
    assert.equal((await f.admin.financialEntry.aggregate({ where: { arenaId: f.arena.id, type: "INCOME" }, _sum: { amountCents: true } }))._sum.amountCents, 600);
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
    assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, type: "INCOME" } }), 0);
  } finally { await f.cleanup(); }
});
