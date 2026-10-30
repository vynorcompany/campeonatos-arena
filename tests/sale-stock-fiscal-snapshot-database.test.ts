import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { consumeProductStock, saveStockAggregates } from "../src/lib/products/stock-aggregates";
import { issueManualFiscalDocument } from "../src/lib/fiscal/manual-issuance";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);

test("receita consumida fica vinculada à venda e ao registro fiscal, sem cobrar ingredientes nem baixar estoque duas vezes", { skip: !local }, async () => {
 const db = new PrismaClient({ datasources: { db: { url } } }); const arenas: string[] = [];
 try {
  const user = await db.user.findFirstOrThrow();
  const arena = await db.arena.create({ data: { createdById: user.id, name: "Fiscal receita QA", slug: `fiscal-recipe-${randomUUID()}` } }); arenas.push(arena.id);
  const foreign = await db.arena.create({ data: { createdById: user.id, name: "Outra QA", slug: `fiscal-recipe-${randomUUID()}` } }); arenas.push(foreign.id);
  await db.fiscalSettings.create({ data: { arenaId: arena.id, enabled: true, provider: "MANUAL", series: "QA" } });
  const coke = await db.product.create({ data: { arenaId: arena.id, name: "Coca ingrediente", sku: "COCA", stockQuantity: 12, costCents: 300 } });
  const drink = await db.product.create({ data: { arenaId: arena.id, name: "Fernet preparado", stockQuantity: 12, priceCents: 2500, stockAggregates: [{ productId: coke.id, quantity: 1 }] } });
  const sale = await db.sale.create({ data: { arenaId: arena.id, code: randomUUID(), paymentMethod: "PIX", totalCents: 5000, items: { create: { productId: drink.id, quantity: 2, unitPriceCents: 2500, totalCents: 5000 } } } });
  const transact = <T>(arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) => db.$transaction(async tx => { await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime"); await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); });
  const items = [{ productId: drink.id, quantity: 2 }];
  await assert.rejects(transact(foreign.id, tx => consumeProductStock(tx, foreign.id, items, "Indevido", sale.id)), /não encontrada/);
  await assert.rejects(transact(arena.id, tx => consumeProductStock(tx, arena.id, [{ productId: drink.id, quantity: 3 }], "Quantidade incorreta", sale.id)), /corresponder/);
  const document = await transact(arena.id, async tx => {
   await consumeProductStock(tx, arena.id, items, `Venda ${sale.code}`, sale.id);
   return issueManualFiscalDocument(tx, { arenaId: arena.id, saleId: sale.id, documentType: "NFC_E", totalCents: 5000, customerName: "QA" });
  });
  const original = await db.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true } });
  const snapshot = original.stockConsumption as any;
  assert.equal(original.items.length, 1); assert.equal(original.totalCents, 5000);
  const ingredient = snapshot.movements.find((row: any) => row.productId === coke.id);
  assert.equal(ingredient.quantity, 2); assert.equal(ingredient.unitCostCents, 300);
  assert.deepEqual(ingredient.sources, [{ soldProductId: drink.id, soldProductName: "Fernet preparado", quantity: 2, ingredient: true }]);
  const movement = await db.stockMovement.findUniqueOrThrow({ where: { id: ingredient.movementId } }); assert.equal(movement.quantity, 2);
  await transact(arena.id, tx => saveStockAggregates(tx, arena.id, drink.id, [{ productId: coke.id, quantity: 3 }]));
  await db.product.update({ where: { id: coke.id }, data: { name: "Coca renomeada", costCents: 450 } });
  await Promise.all([transact(arena.id, tx => consumeProductStock(tx, arena.id, items, "Repetido A", sale.id)), transact(arena.id, tx => consumeProductStock(tx, arena.id, items, "Repetido B", sale.id))]);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: coke.id } })).stockQuantity, 10);
  assert.equal(await db.stockMovement.count({ where: { arenaId: arena.id } }), 2);
  const linked = await transact(arena.id, tx => tx.fiscalDocument.findUniqueOrThrow({ where: { id: document.id }, include: { sale: true } }));
  assert.deepEqual(linked.sale?.stockConsumption, snapshot);
  assert.equal((linked.sale?.stockConsumption as any).movements.find((row: any) => row.productId === coke.id).name, "Coca ingrediente");
  const failing = await db.sale.create({ data: { arenaId: arena.id, code: randomUUID(), paymentMethod: "PIX", totalCents: 2500, items: { create: { productId: drink.id, quantity: 1, unitPriceCents: 2500, totalCents: 2500 } } } });
  await db.fiscalSettings.update({ where: { arenaId: arena.id }, data: { enabled: false } });
  await assert.rejects(transact(arena.id, async tx => { await consumeProductStock(tx, arena.id, [{ productId: drink.id, quantity: 1 }], "Deve reverter", failing.id); await issueManualFiscalDocument(tx, { arenaId: arena.id, saleId: failing.id, documentType: "NFC_E", totalCents: 2500, customerName: "QA" }); }), /Configure/);
  assert.equal((await db.sale.findUniqueOrThrow({ where: { id: failing.id } })).stockConsumption, null);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: coke.id } })).stockQuantity, 10);
 } finally {
  for (const arenaId of arenas) { await db.fiscalDocument.deleteMany({ where: { arenaId } }); await db.sale.deleteMany({ where: { arenaId } }); await db.stockMovement.deleteMany({ where: { arenaId } }); await db.product.deleteMany({ where: { arenaId } }); await db.fiscalSettings.deleteMany({ where: { arenaId } }); await db.arena.delete({ where: { id: arenaId } }); } await db.$disconnect();
 }
});
