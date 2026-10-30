import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { saveStockAggregates, consumeProductStock, assertAggregateAvailability, catalogAggregateAvailability } from "../src/lib/products/stock-aggregates";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
test("agregados: multiplica, soma consumo compartilhado, isola arena e reverte transação sem estoque", { skip: !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url) }, async () => {
 const db = new PrismaClient({ datasources: { db: { url } } }); const arenaIds: string[] = [];
 try {
  const actor = await db.user.findFirstOrThrow();
  const a = await db.arena.create({ data: { createdById: actor.id, name: "Agregados QA", slug: `recipe-${randomUUID()}` } }); arenaIds.push(a.id);
  const b = await db.arena.create({ data: { createdById: actor.id, name: "Outra QA", slug: `recipe-${randomUUID()}` } }); arenaIds.push(b.id);
  const soda = await db.product.create({ data: { arenaId: a.id, name: "Coca", stockQuantity: 5 } });
  const drink = await db.product.create({ data: { arenaId: a.id, name: "Fernet", stockQuantity: 20, priceCents: 2500 } });
  const other = await db.product.create({ data: { arenaId: b.id, name: "Fora", stockQuantity: 50 } });
  const tx = <T>(operation: (client: Prisma.TransactionClient) => Promise<T>) => db.$transaction(async client => { await client.$executeRawUnsafe("SET LOCAL ROLE arena_runtime"); await client.$executeRaw`SELECT set_config('app.arena_id', ${a.id}, true)`; return operation(client); });
  await assert.rejects(tx(c => saveStockAggregates(c, a.id, drink.id, [{ productId: other.id, quantity: 1 }])), /desta arena/);
  await assert.rejects(tx(c => saveStockAggregates(c, a.id, drink.id, [{ productId: drink.id, quantity: 1 }])), /si mesmo/);
  await tx(c => saveStockAggregates(c, a.id, drink.id, [{ productId: soda.id, quantity: 2 }]));
  await assert.rejects(tx(c => saveStockAggregates(c, a.id, soda.id, [{ productId: drink.id, quantity: 1 }])), /já é agregado/);
  const catalog = await tx(async c => catalogAggregateAvailability(c, a.id, await c.product.findMany({ where: { arenaId: a.id, id: drink.id } })));
  assert.equal(catalog[0].stockQuantity, 2);
  await assert.rejects(tx(c => assertAggregateAvailability(c, a.id, [{ productId: drink.id, quantity: 2 }, { productId: soda.id, quantity: 2 }])), /indisponível/);
  await tx(c => consumeProductStock(c, a.id, [{ productId: drink.id, quantity: 2 }], "Comanda QA"));
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: drink.id } })).stockQuantity, 18);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: soda.id } })).stockQuantity, 1);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: drink.id } })).priceCents, 2500);
  const movements = await db.stockMovement.findMany({ where: { arenaId: a.id } }); assert.equal(movements.length, 2); assert.equal(movements.find(row => row.productId === soda.id)?.quantity, 4);
  await assert.rejects(tx(c => consumeProductStock(c, a.id, [{ productId: drink.id, quantity: 1 }], "Não pode concluir")), /insuficiente/);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: drink.id } })).stockQuantity, 18);
  assert.equal(await db.stockMovement.count({ where: { arenaId: a.id } }), 2);
  await db.product.update({ where: { id: soda.id }, data: { stockQuantity: 2 } });
  const results = await Promise.allSettled([tx(c => consumeProductStock(c, a.id, [{ productId: drink.id, quantity: 1 }], "Venda A")), tx(c => consumeProductStock(c, a.id, [{ productId: drink.id, quantity: 1 }], "Venda B"))]);
  assert.equal(results.filter(row => row.status === "fulfilled").length, 1);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: soda.id } })).stockQuantity, 0);
 } finally { for (const arenaId of arenaIds) { await db.stockMovement.deleteMany({ where: { arenaId } }); await db.product.deleteMany({ where: { arenaId } }); await db.arena.delete({ where: { id: arenaId } }); } await db.$disconnect(); }
});
