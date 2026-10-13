import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("produto não pode vincular categoria de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do catálogo de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const ownCategory = await tx.productCategory.create({ data: { arenaId: arenaA.id, name: `Categoria própria ${Date.now()}` } });
      const ownProduct = await tx.product.create({ data: { arenaId: arenaA.id, name: `Produto próprio ${Date.now()}`, categoryId: ownCategory.id } });
      assert.equal(ownProduct.categoryId, ownCategory.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignCategory = await tx.productCategory.create({ data: { arenaId: arenaB.id, name: `Categoria externa ${Date.now()}` } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.product.create({ data: { arenaId: arenaA.id, name: `Produto inválido ${Date.now()}`, categoryId: foreignCategory.id } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("nota fiscal só pode vincular lançamento e venda da mesma arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback da nota fiscal de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const ownEntry = await tx.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Lançamento próprio", amountCents: 100 } });
      const ownDocument = await tx.fiscalDocument.create({ data: { arenaId: arenaA.id, accessKey: `GOAL-OWN-${Date.now()}`, financialEntryId: ownEntry.id } });
      assert.equal(ownDocument.financialEntryId, ownEntry.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignEntry = await tx.financialEntry.create({ data: { arenaId: arenaB.id, type: "REVENUE", category: "GOAL", description: "Lançamento externo", amountCents: 100 } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.fiscalDocument.create({ data: { arenaId: arenaA.id, accessKey: `GOAL-ENTRY-${Date.now()}`, financialEntryId: foreignEntry.id } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignSale = await tx.sale.create({ data: { arenaId: arenaB.id, code: `GOAL-FISCAL-${Date.now()}`, paymentMethod: "PIX", totalCents: 100 } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.fiscalDocument.create({ data: { arenaId: arenaA.id, accessKey: `GOAL-SALE-${Date.now()}`, saleId: foreignSale.id } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("item fiscal não pode vincular produto de outra arena", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback do item fiscal de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const document = await tx.fiscalDocument.create({ data: { arenaId: arenaA.id, accessKey: `GOAL-ITEM-${Date.now()}` } });
      const ownProduct = await tx.product.create({ data: { arenaId: arenaA.id, name: `Produto fiscal próprio ${Date.now()}` } });
      const ownItem = await tx.fiscalDocumentItem.create({ data: { fiscalDocumentId: document.id, productId: ownProduct.id, description: "Item próprio", quantity: 1 } });
      assert.equal(ownItem.productId, ownProduct.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreignProduct = await tx.product.create({ data: { arenaId: arenaB.id, name: `Produto fiscal externo ${Date.now()}` } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assert.rejects(tx.fiscalDocumentItem.create({ data: { fiscalDocumentId: document.id, productId: foreignProduct.id, description: "Item inválido", quantity: 1 } }), /42501|row-level security|segurança no nível de linha/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
