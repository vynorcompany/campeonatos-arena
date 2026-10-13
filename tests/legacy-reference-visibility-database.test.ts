import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("registros legados com vínculo inconsistente continuam visíveis à própria arena, sem expor o pai externo", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback dos vínculos legados de teste");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      const suffix = Date.now();
      const foreignCategory = await tx.productCategory.create({ data: { arenaId: arenaB.id, name: `Categoria legada ${suffix}` } });
      const foreignProduct = await tx.product.create({ data: { arenaId: arenaB.id, name: `Produto externo legado ${suffix}` } });
      const foreignEntry = await tx.financialEntry.create({ data: { arenaId: arenaB.id, type: "REVENUE", category: "GOAL", description: "Lançamento externo legado", amountCents: 100 } });
      const foreignSale = await tx.sale.create({ data: { arenaId: arenaB.id, code: `GOAL-LEGACY-${suffix}`, paymentMethod: "PIX", totalCents: 100 } });
      const foreignRegister = await tx.cashRegister.create({ data: { arenaId: arenaB.id, referenceDate: new Date("2035-01-02T12:00:00Z") } });
      const ownProduct = await tx.product.create({ data: { arenaId: arenaA.id, name: `Produto legado ${suffix}`, categoryId: foreignCategory.id } });
      const ownDocument = await tx.fiscalDocument.create({ data: { arenaId: arenaA.id, accessKey: `GOAL-LEGACY-${suffix}`, financialEntryId: foreignEntry.id, saleId: foreignSale.id } });
      const ownItem = await tx.fiscalDocumentItem.create({ data: { fiscalDocumentId: ownDocument.id, productId: foreignProduct.id, description: "Item legado", quantity: 1 } });
      const ownStock = await tx.stockMovement.create({ data: { arenaId: arenaA.id, productId: foreignProduct.id, type: "IN", quantity: 1 } });
      const ownEntry = await tx.financialEntry.create({ data: { arenaId: arenaA.id, type: "REVENUE", category: "GOAL", description: "Lançamento próprio legado", amountCents: 100 } });
      const ownSettlement = await tx.financialSettlement.create({ data: { arenaId: arenaA.id, financialEntryId: ownEntry.id, saleId: foreignSale.id, amountCents: 100, paymentMethod: "PIX" } });
      const ownMovement = await tx.cashMovement.create({ data: { arenaId: arenaA.id, registerId: foreignRegister.id, type: "IN", amountCents: 100 } });

      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await tx.product.findFirst({ where: { id: ownProduct.id }, select: { id: true } }))?.id, ownProduct.id);
      assert.equal((await tx.fiscalDocument.findFirst({ where: { id: ownDocument.id }, select: { id: true } }))?.id, ownDocument.id);
      assert.equal((await tx.fiscalDocumentItem.findFirst({ where: { id: ownItem.id }, select: { id: true } }))?.id, ownItem.id);
      assert.equal((await tx.stockMovement.findFirst({ where: { id: ownStock.id }, select: { id: true } }))?.id, ownStock.id);
      assert.equal((await tx.financialSettlement.findFirst({ where: { id: ownSettlement.id }, select: { id: true } }))?.id, ownSettlement.id);
      assert.equal((await tx.cashMovement.findFirst({ where: { id: ownMovement.id }, select: { id: true } }))?.id, ownMovement.id);
      assert.equal(await tx.product.findFirst({ where: { id: foreignProduct.id }, select: { id: true } }), null);
      assert.equal(await tx.productCategory.findFirst({ where: { id: foreignCategory.id }, select: { id: true } }), null);
      assert.equal(await tx.financialEntry.findFirst({ where: { id: foreignEntry.id }, select: { id: true } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
