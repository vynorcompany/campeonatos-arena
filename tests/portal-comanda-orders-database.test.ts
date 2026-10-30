import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { submitPortalOrder, confirmPortalOrderItem, appendComandaProduct } from "../src/lib/comandas/portal-orders";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);

test("pedido do Portal é atômico e idempotente; confirmação lança só o pedido selecionado, uma vez", { skip: !local }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } }); const arenas: string[] = [];
  try {
    const actor = await db.user.findFirstOrThrow();
    const a = await db.arena.create({ data: { createdById: actor.id, name: "Pedidos QA", slug: `orders-${randomUUID()}` } }); arenas.push(a.id);
    const b = await db.arena.create({ data: { createdById: actor.id, name: "Outra QA", slug: `orders-${randomUUID()}` } }); arenas.push(b.id);
    const player = await db.player.create({ data: { arenaId: a.id, name: "Atleta QA" } });
    const stranger = await db.player.create({ data: { arenaId: a.id, name: "Outro atleta QA" } });
    const products = await Promise.all([a.id, a.id, b.id].map((arenaId, index) => db.product.create({ data: { arenaId, name: `Produto ${index}`, stockQuantity: 10, priceCents: 350 } })));
    const comanda = await db.comanda.create({ data: { arenaId: a.id, playerId: player.id, label: "QA", code: randomUUID() } });
    const tx = <T>(arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) => db.$transaction(async client => { await client.$executeRawUnsafe("SET LOCAL ROLE arena_runtime"); await client.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(client); });
    const input = { arenaId: a.id, playerId: player.id, comandaId: comanda.id, orderId: randomUUID(), items: [{ productId: products[0].id, quantity: 2 }, { productId: products[1].id, quantity: 3 }] };
    await assert.rejects(tx(a.id, client => submitPortalOrder(client, { ...input, playerId: stranger.id })), /não está disponível/);
    await assert.rejects(tx(a.id, client => submitPortalOrder(client, { ...input, items: [input.items[0], { productId: products[2].id, quantity: 1 }] })), /indisponível/);
    assert.equal(await db.comandaRequest.count({ where: { comandaId: comanda.id } }), 0);
    await assert.rejects(tx(a.id, client => submitPortalOrder(client, { ...input, items: [{ productId: products[0].id, quantity: 11 }] })), /indisponível/);
    await assert.rejects(tx(a.id, client => submitPortalOrder(client, { ...input, items: [input.items[0], input.items[0]] })), /Revise/);
    const result = await Promise.all([tx(a.id, client => submitPortalOrder(client, input)), tx(a.id, client => submitPortalOrder(client, input))]);
    assert.deepEqual(result.map(row => row.replayed).sort(), [false, true]);
    assert.equal(await db.comandaItem.count({ where: { comandaId: comanda.id } }), 0);
    assert.equal(await db.arenaNotification.count({ where: { arenaId: a.id, type: "COMANDA_REQUEST" } }), 1);
    const requests = await db.comandaRequest.findMany({ where: { comandaId: comanda.id }, orderBy: { quantity: "asc" } });
    assert.deepEqual(requests.map(row => row.quantity), [2, 3]);
    await assert.rejects(tx(b.id, client => confirmPortalOrderItem(client, b.id, requests[0].id)), /não encontrado/);
    await tx(a.id, client => appendComandaProduct(client, a.id, { comandaId: comanda.id, productId: products[0].id, quantity: 1, durationMinutes: 60 }));
    assert.equal((await db.comandaRequest.findUniqueOrThrow({ where: { id: requests[0].id } })).status, "PENDING");
    await Promise.all([tx(a.id, client => confirmPortalOrderItem(client, a.id, requests[0].id)), tx(a.id, client => confirmPortalOrderItem(client, a.id, requests[0].id))]);
    const item = await db.comandaItem.findUniqueOrThrow({ where: { comandaId_productId_variantKey: { comandaId: comanda.id, productId: products[0].id, variantKey:"" } } });
    assert.equal(item.quantity, 3); assert.equal(item.totalCents, 1050);
    assert.equal((await db.comandaRequest.findUniqueOrThrow({ where: { id: requests[1].id } })).status, "PENDING");
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: products[0].id } })).stockQuantity, 10);
    await db.comanda.update({ where: { id: comanda.id }, data: { status: "CLOSED" } });
    await assert.rejects(tx(a.id, client => confirmPortalOrderItem(client, a.id, requests[1].id)), /não está disponível/);
  } finally {
    for (const arenaId of arenas) { await db.arenaNotification.deleteMany({ where: { arenaId } }); await db.comanda.deleteMany({ where: { arenaId } }); await db.product.deleteMany({ where: { arenaId } }); await db.player.deleteMany({ where: { arenaId } }); await db.arena.delete({ where: { id: arenaId } }); }
    await db.$disconnect();
  }
});
