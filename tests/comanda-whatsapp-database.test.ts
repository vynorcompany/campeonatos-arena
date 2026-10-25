import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { enqueueComandaWhatsapp } from "../src/lib/comandas/whatsapp-outbox";
import * as operationalPolicy from "../src/lib/comandas/operational-policy";
import { allocateComandaShares } from "../src/lib/comandas/split";
import { allocatePaymentsToDebts, getOutstandingCents } from "../src/lib/finance/settlements";
import { comandaDebtOwnerId, selectedComandaDebtWhere } from "../src/lib/finance/comanda-debts";
import { cashReferenceDate } from "../src/lib/finance/cash-day";
import { recordCashSaleIfOpen } from "../src/lib/finance/cash-register-sales";
const nodeRequire = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("comanda WhatsApp sends only committed own shares once and preserves financial closure on uncertain delivery", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } }); const ids: string[] = [];
  try {
    for (const name of ["A", "B"]) { const arena = await admin.arena.create({ data: { name: `WhatsApp QA ${name}`, slug: `comanda-whatsapp-${randomUUID()}`, createdById: "goal-test" } }); ids.push(arena.id); }
    const owner = await admin.player.create({ data: { arenaId: ids[0], name: "Owner QA", phone: "5511999990001" } });
    const partner = await admin.player.create({ data: { arenaId: ids[0], name: "Partner QA", phone: "5511999990002" } });
    const foreign = await admin.player.create({ data: { arenaId: ids[1], name: "Foreign QA", phone: "5511999990003" } });
    const product = await admin.product.create({ data: { arenaId: ids[0], name: "Service QA", isService: true, priceCents: 1000 } });
    await admin.arenaOperationalSettings.create({ data: { arenaId: ids[0], whatsappPaidEnabled: true, whatsappUnpaidEnabled: true, whatsappMessage: "{cliente}|{total}|{pendente}|{status}" } });
    const transact = (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); });
    const callbacks: (() => Promise<void>)[] = []; const sent: { phone: string; message: string }[] = []; let failProvider = false; let failQueue = false;
    const exports: Record<string, any> = {}; const dispatcher: Record<string, any> = {};
    const common: Record<string, unknown> = { "@/lib/rls": { withArenaTransaction: transact } };
    const load = (file: string, target: Record<string, any>, mocks: Record<string, unknown>) => vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: target, FormData, Date, AbortSignal, crypto: globalThis.crypto, console, require: (name: string) => mocks[name] ?? (name.startsWith("@/") ? {} : nodeRequire(name)) });
    load("../src/lib/comandas/whatsapp-delivery.ts", dispatcher, { ...common, "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: async (phone: string, message: string, arenaId: string) => {
      assert.equal(arenaId, ids[0]); assert.equal(await admin.sale.count({ where: { arenaId: ids[0] } }) > 0, true, "provider called before sale commit");
      sent.push({ phone, message }); if (failProvider) throw Error("Network uncertainty"); return {};
    } } });
    load("../src/lib/actions/comanda.ts", exports, { ...common,
      "next/cache": { revalidatePath() {} }, "next/server": { after: (callback: () => Promise<void>) => callbacks.push(callback) },
      "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: ids[0], userId: "goal-test", userName: "WhatsApp QA" }) },
      "@/lib/comandas/whatsapp-outbox": { enqueueComandaWhatsapp: (...args: Parameters<typeof enqueueComandaWhatsapp>) => { if (failQueue) throw Error("Queue unavailable"); return enqueueComandaWhatsapp(...args); } },
      "@/lib/comandas/whatsapp-delivery": dispatcher, "@/lib/comandas/operational-policy": operationalPolicy,
      "@/lib/comandas/split": { allocateComandaShares }, "@/lib/finance/settlements": { allocatePaymentsToDebts, getOutstandingCents }, "@/lib/finance/comanda-debts": { comandaDebtOwnerId, selectedComandaDebtWhere }, "@/lib/finance/cash-day": { cashReferenceDate }, "@/lib/finance/cash-register-sales": { recordCashSaleIfOpen },
    });
    const bill = () => admin.comanda.create({ data: { arenaId: ids[0], playerId: owner.id, label: owner.name, code: `WA-${randomUUID()}`, items: { create: { productId: product.id, quantity: 1, unitPriceCents: 1000, totalCents: 1000 } } } });
    const finish = (comandaId: string, split = false) => { const form = new FormData(); form.set("comandaId", comandaId); form.set("payments", JSON.stringify([{ paymentMethod: "PIX", amountCents: split ? 400 : 1000 }])); if (split) form.set("shares", JSON.stringify([{ playerId: owner.id, amountCents: 400 }, { playerId: partner.id, amountCents: 600 }])); return exports.finishComandaAction(form); };
    const first = await bill(); await finish(first.id, true);
    assert.equal(sent.length, 0); assert.equal(callbacks.length, 1);
    const deliveries = await admin.comandaWhatsappDelivery.findMany({ where: { comandaId: first.id } }); assert.equal(deliveries.length, 2);
    assert.match(deliveries.find(row => row.playerId === owner.id)!.message, /Owner QA\|R\$\s*4,00\|R\$\s*0,00\|Quitada/);
    assert.match(deliveries.find(row => row.playerId === partner.id)!.message, /Partner QA\|R\$\s*6,00\|R\$\s*6,00\|Pagamento pendente/);
    assert.doesNotMatch(deliveries.map(row => row.message).join(" "), /10,00/);
    await Promise.all([callbacks.shift()!(), ...deliveries.map(row => dispatcher.dispatchComandaWhatsapp(ids[0], row.id))]);
    assert.equal(sent.length, 2); assert.equal(await admin.comandaWhatsappDelivery.count({ where: { comandaId: first.id, status: "SENT" } }), 2);
    const foreignRows = await transact(ids[1], tx => tx.comandaWhatsappDelivery.findMany({ where: { comandaId: first.id } })); assert.deepEqual(foreignRows, []);
    await assert.rejects(transact(ids[0], tx => tx.comandaWhatsappDelivery.create({ data: { arenaId: ids[0], comandaId: first.id, playerId: foreign.id, kind: "PAID", message: "Forbidden" } })));
    await assert.rejects(finish(first.id), /não está disponível/); assert.equal(callbacks.length, 0);
    failProvider = true; const second = await bill(); await finish(second.id); await callbacks.shift()!();
    const unknown = await admin.comandaWhatsappDelivery.findFirstOrThrow({ where: { comandaId: second.id } }); assert.equal(unknown.status, "UNKNOWN");
    assert.equal((await admin.comanda.findUniqueOrThrow({ where: { id: second.id } })).status, "CLOSED");
    assert.equal(await admin.sale.count({ where: { comandaId: second.id } }), 1);
    await dispatcher.dispatchComandaWhatsapp(ids[0], unknown.id); assert.equal(sent.length, 3);
    failQueue = true; const third = await bill(); await assert.rejects(finish(third.id), /Queue unavailable/);
    assert.equal((await admin.comanda.findUniqueOrThrow({ where: { id: third.id } })).status, "OPEN"); assert.equal(await admin.sale.count({ where: { comandaId: third.id } }), 0); assert.equal(callbacks.length, 0);
  } finally { await admin.sale.deleteMany({ where: { arenaId: { in: ids } } }); await admin.comanda.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialEntry.deleteMany({ where: { arenaId: { in: ids } } }); await admin.arena.deleteMany({ where: { id: { in: ids } } }); await runtime.$disconnect(); await admin.$disconnect(); }
});
