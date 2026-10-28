import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
const require = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const value = new URL(url); return value.hostname === "127.0.0.1" && value.port === "55433" && value.pathname === "/arena_goal"; } catch { return false; } })();
test("stock balance saves the full counted snapshot, including unchanged stock, and rejects foreign products", { skip: !enabled }, async () => {
 const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
 const ids: string[] = []; const title = `Balanço QA ${randomUUID()}`;
 try {
  const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } }); const other = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
  for (const [index, arenaId] of [arena.id, arena.id, other.id].entries()) ids.push((await admin.product.create({ data: { arenaId, name: `${title}-${index}`, stockQuantity: 5 } })).id);
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  const mocks: Record<string, unknown> = { "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arena.id, userId: "goal-test", userName: "QA" }) }, "@/lib/arena-database": { arenaDatabase: () => ({ $transaction: (operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`; return operation(tx); }) }) } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/pos.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, FormData, Date, Intl, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? (name.startsWith("@/") ? {} : require(name)) });
  const form = new FormData(); form.set("title", title); form.set(`count_${ids[0]}`, "3"); form.set(`count_${ids[1]}`, "5");
  await exports.createStockBalanceAction(form);
  const receipt = await admin.auditEvent.findFirstOrThrow({ where: { arenaId: arena.id, action: "STOCK_BALANCE_COMPLETED", details: { path: ["title"], equals: title } } });
  const details = receipt.details as { items: { productId: string; systemQuantity: number; countedQuantity: number; difference: number }[] };
  assert.equal(details.items.length, 2); assert.equal(details.items[1].difference, 0); assert.equal(details.items[0].systemQuantity, 5); assert.equal(details.items[0].countedQuantity, 3);
  assert.equal(await admin.stockMovement.count({ where: { productId: { in: ids } } }), 1);
  await admin.product.update({ where: { id: ids[0] }, data: { stockQuantity: 9 } });
  assert.equal(((await admin.auditEvent.findUniqueOrThrow({ where: { id: receipt.id } })).details as typeof details).items[0].countedQuantity, 3);
  const invalid = new FormData(); invalid.set(`count_${ids[0]}`, "1"); invalid.set(`count_${ids[2]}`, "1"); await assert.rejects(exports.createStockBalanceAction(invalid), /não pertencem/);
  assert.equal((await admin.product.findUniqueOrThrow({ where: { id: ids[0] } })).stockQuantity, 9);
 } finally { await admin.auditEvent.deleteMany({ where: { action: "STOCK_BALANCE_COMPLETED", details: { path: ["title"], equals: title } } }); await admin.stockMovement.deleteMany({ where: { productId: { in: ids } } }); await admin.product.deleteMany({ where: { id: { in: ids } } }); await runtime.$disconnect(); await admin.$disconnect(); }
});
