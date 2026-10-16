import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertFinancialEntryRelationsBelongToArena } from "../src/lib/finance/entry-relations";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch {
    return false;
  }
})();

test("vínculos de lançamentos financeiros aceitam apenas registros da arena ativa", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback dos vínculos financeiros descartáveis");
  const suffix = randomBytes(6).toString("hex");
  try {
    const [arenaA, arenaB] = await Promise.all([
      db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    await assert.rejects(db.$transaction(async (tx) => {
      const createRelations = async (arenaId: string) => ({
        supplierId: (await tx.supplier.create({ data: { arenaId, name: `Fornecedor ${suffix}` } })).id,
        bankAccountId: (await tx.bankAccount.create({ data: { arenaId, name: `Banco ${suffix}` } })).id,
        planId: (await tx.plan.create({ data: { arenaId, name: `Plano ${suffix}` } })).id,
        productId: (await tx.product.create({ data: { arenaId, name: `Produto ${suffix}` } })).id,
        playerId: (await tx.player.create({ data: { arenaId, name: `Cliente ${suffix}` } })).id,
      });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const local = await createRelations(arenaA.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreign = await createRelations(arenaB.id);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await assertFinancialEntryRelationsBelongToArena(tx, arenaA.id, local);
      await assertFinancialEntryRelationsBelongToArena(tx, arenaA.id, {});

      const expectedErrors = {
        supplierId: /Fornecedor não encontrado nesta arena/,
        bankAccountId: /Conta bancária não encontrada nesta arena/,
        planId: /Plano não encontrado nesta arena/,
        productId: /Produto não encontrado nesta arena/,
        playerId: /Cliente não encontrado nesta arena/,
      };
      for (const key of Object.keys(expectedErrors) as (keyof typeof expectedErrors)[]) {
        await assert.rejects(
          assertFinancialEntryRelationsBelongToArena(tx, arenaA.id, { [key]: foreign[key] }),
          expectedErrors[key],
        );
      }
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
