import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
import { allocateComandaShares } from "../src/lib/comandas/split";
import { allocatePaymentsToDebts, getOutstandingCents } from "../src/lib/finance/settlements";
const require = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const u = new URL(url); return u.hostname === "127.0.0.1" && u.port === "55433" && u.pathname === "/arena_goal"; } catch { return false; } })();
function load(file: string, mocks: Record<string, unknown>) {
  const exports: Record<string, (input: FormData) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, FormData, Date, crypto: globalThis.crypto, require: (name: string) => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith("@/") ? {} : require(name) });
  return exports;
}
function form(values: Record<string, string>) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
test("serviços respeitam as duas visibilidades, isolamento e permissões; comanda guarda autor e cobra sem baixar estoque", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = []; let commandId = ""; let allowed = true;
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const other = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const actor = await admin.user.findUniqueOrThrow({ where: { id: "goal-test" } });
    const auth = { arenaId: arena.id, userId: actor.id, userName: actor.name };
    const transact = (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); });
    const mocks = { "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requireModuleEdit: async () => { if (!allowed) throw new Error("Sem permissão"); return auth; }, requirePermission: async () => auth }, "@/lib/rls": { withArenaTransaction: transact }, "@/lib/arena-database": { arenaDatabase: () => ({}) }, "@/lib/comandas/split": { allocateComandaShares }, "@/lib/finance/settlements": { allocatePaymentsToDebts, getOutstandingCents } };
    const services = load("../src/lib/actions/services.ts", mocks);
    for (const agenda of [false, true]) for (const commands of [false, true]) {
      const name = `Serviço QA ${randomUUID()}`;
      await services.saveServiceAction(form({ name, price: "25,50", ...(agenda ? { showOnAgenda: "on" } : {}), ...(commands ? { showOnComandas: "on" } : {}), arenaId: other.id }));
      const service = await admin.product.findUniqueOrThrow({ where: { arenaId_name: { arenaId: arena.id, name } } }); ids.push(service.id);
      assert.equal(service.isService, true); assert.equal(service.priceCents, 2550);
      assert.equal(service.showOnAgenda, agenda); assert.equal(service.showOnComandas, commands);
      assert.equal(service.createdByUserId, actor.id);
    }
    allowed = false;
    await assert.rejects(services.saveServiceAction(form({ name: "Unauthorized", price: "1,00" })), /Sem permissão/);
    allowed = true;
    const foreign = await admin.product.create({ data: { arenaId: other.id, name: `Outro ${randomUUID()}`, isService: true } }); ids.push(foreign.id);
    await assert.rejects(services.saveServiceAction(form({ id: foreign.id, name: "Not allowed", price: "1,00" })), /não encontrado/);
    const commands = load("../src/lib/actions/comanda.ts", mocks);
    const opened = await commands.createComandaAction(form({ type: "AVULSA", label: "Teste de serviço" })); commandId = opened.comandaId;
    const command = await admin.comanda.findUniqueOrThrow({ where: { id: commandId } });
    assert.equal(command.openedByUserId, actor.id); assert.equal(command.openedByUserName, actor.name);
    await assert.rejects(commands.addComandaProductAction(form({ comandaId: commandId, productId: ids[0], quantity: "1" })), /Produto não encontrado/);
    await commands.addComandaProductAction(form({ comandaId: commandId, productId: ids[3], quantity: "2" }));
    await commands.finishComandaAction(form({ comandaId: commandId, payments: "[]" }));
    assert.equal((await admin.comanda.findUniqueOrThrow({ where: { id: commandId } })).status, "CLOSED");
    assert.equal((await admin.sale.findUniqueOrThrow({ where: { comandaId: commandId } })).totalCents, 5100);
    assert.equal((await admin.product.findUniqueOrThrow({ where: { id: ids[3] } })).stockQuantity, 0);
    assert.equal(await admin.stockMovement.count({ where: { productId: ids[3] } }), 0);
  } finally {
    if (commandId) { const sale = await admin.sale.findUnique({ where: { comandaId: commandId } }); if (sale) { await admin.financialEntry.deleteMany({ where: { saleId: sale.id } }); await admin.sale.delete({ where: { id: sale.id } }); } await admin.comanda.deleteMany({ where: { id: commandId } }); }
    await admin.product.deleteMany({ where: { id: { in: ids } } });
    await admin.auditEvent.deleteMany({ where: { entityId: { in: [...ids, commandId] } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
