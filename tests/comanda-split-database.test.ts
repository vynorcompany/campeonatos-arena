import * as operationalPolicy from "../src/lib/comandas/operational-policy";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { z } from "zod";
import { PrismaClient, type Prisma } from "@prisma/client";
import { allocateComandaShares } from "../src/lib/comandas/split";
import { allocatePaymentsToDebts, getOutstandingCents } from "../src/lib/finance/settlements";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = (() => { try { const parsed = new URL(url); return parsed.hostname === "127.0.0.1" && parsed.port === "55433" && parsed.pathname === "/arena_goal"; } catch { return false; } })();
test("divisão finalizada grava débitos por pessoa, não duplica estoque e rejeita pessoa de outra arena", { skip: !disposable }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const nonce = randomUUID(); const commandIds: string[] = []; const playerIds: string[] = []; let productId = "";
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const other = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const actor = await admin.user.findFirstOrThrow({ where: { id: "goal-test" } });
    for (const arenaId of [arena.id, arena.id, other.id]) playerIds.push((await admin.player.create({ data: { arenaId, name: `Divisão ${nonce}` } })).id);
    productId = (await admin.product.create({ data: { arenaId: arena.id, name: `Produto divisão ${nonce}`, priceCents: 1000, stockQuantity: 10 } })).id;
    const createCommand = async () => { const command = await admin.comanda.create({ data: { arenaId: arena.id, code: randomUUID(), label: `Divisão ${nonce}`, playerId: playerIds[0], items: { create: { productId, quantity: 1, unitPriceCents: 1000, totalCents: 1000 } } } }); commandIds.push(command.id); return command; };
    const transact = (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); });
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const mocks: Record<string, unknown> = { "@/lib/comandas/operational-policy": operationalPolicy, zod: { z }, "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arena.id, userId: actor.id, userName: actor.name }) }, "@/lib/rls": { withArenaTransaction: transact }, "@/lib/comandas/split": { allocateComandaShares }, "@/lib/finance/settlements": { allocatePaymentsToDebts, getOutstandingCents } };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/comanda.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, FormData, Date, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? {} });
    const finish = (comandaId: string, secondId: string) => { const form = new FormData(); form.set("comandaId", comandaId); form.set("payments", "[]"); form.set("shares", JSON.stringify([{ playerId: playerIds[0], amountCents: 600 }, { playerId: secondId, amountCents: 400 }])); return exports.finishComandaAction(form); };
    const rejected = await createCommand();
    await assert.rejects(finish(rejected.id, playerIds[2]), /nesta arena/);
    assert.equal(await admin.sale.count({ where: { comandaId: rejected.id } }), 0);
    assert.equal((await admin.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity, 10);
    const accepted = await createCommand();
    const outcomes = await Promise.allSettled([finish(accepted.id, playerIds[1]), finish(accepted.id, playerIds[1])]);
    assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
    const sale = await admin.sale.findUniqueOrThrow({ where: { comandaId: accepted.id }, include: { financialEntries: true } });
    assert.equal(sale.totalCents, 1000);
    assert.deepEqual(new Map(sale.financialEntries.map(entry => [entry.playerId, entry.amountCents])), new Map([[playerIds[0], 600], [playerIds[1], 400]]));
    assert.equal((await admin.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity, 9);
    assert.equal(await admin.auditEvent.count({ where: { arenaId: arena.id, entityId: accepted.id, action: "COMANDA_SPLIT" } }), 1);
  } finally {
    const sales = await admin.sale.findMany({ where: { comandaId: { in: commandIds } }, select: { id: true } });
    await admin.auditEvent.deleteMany({ where: { entityId: { in: commandIds } } });
    await admin.financialEntry.deleteMany({ where: { saleId: { in: sales.map(sale => sale.id) } } });
    await admin.sale.deleteMany({ where: { id: { in: sales.map(sale => sale.id) } } });
    await admin.comanda.deleteMany({ where: { id: { in: commandIds } } });
    if (productId) { await admin.stockMovement.deleteMany({ where: { productId } }); await admin.product.delete({ where: { id: productId } }); }
    await admin.player.deleteMany({ where: { id: { in: playerIds } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
