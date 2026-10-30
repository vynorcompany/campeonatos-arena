import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { saveProductFiscalProfile } from "../src/lib/fiscal/product-profile-service";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
test(
  "fiscal: salva por arena, rejeita NCM/classificação inválidos e não altera composição, preço ou estoque",
  { skip: !/^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url) },
  async () => {
    const db = new PrismaClient({ datasources: { db: { url } } }),
      ids: string[] = [];
    try {
      const actor = await db.user.findFirstOrThrow();
      for (let i = 0; i < 2; i++) {
        const arena = await db.arena.create({
          data: {
            slug: `fiscal-${randomUUID()}`,
            name: "Fiscal QA",
            createdById: actor.id,
          },
        });
        ids.push(arena.id);
      }
      const [a, b] = ids;
      await db.fiscalSettings.create({
        data: { arenaId: a, issuerState: "PR", crt: "1" },
      });
      const ingredient = await db.product.create({
        data: { arenaId: a, name: "Ingrediente QA", stockQuantity: 10 },
      });
      const product = await db.product.create({
        data: {
          arenaId: a,
          name: "Produto fiscal QA",
          priceCents: 2500,
          costCents: 500,
          stockQuantity: 20,
          stockAggregates: [{ productId: ingredient.id, quantity: 1 }],
        },
      });
      const foreign = await db.product.create({
          data: { arenaId: b, name: "Outra arena" },
        }),
        service = await db.product.create({
          data: { arenaId: a, name: "Serviço", isService: true },
        });
      const tx = <T>(fn: (client: Prisma.TransactionClient) => Promise<T>) =>
        db.$transaction(async (client) => {
          await client.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
          await client.$executeRaw`SELECT set_config('app.arena_id',${a},true)`;
          return fn(client);
        });
      const good = {
        ncm: "22021000",
        origin: "0",
        cfop: "5102",
        icmsCode: "102",
        gtin: "SEM GTIN",
        gtinTrib: "SEM GTIN",
        commercialUnit: "UN",
        tributaryUnit: "UN",
        tributaryFactor: "1",
        pisCst: "49",
        cofinsCst: "49",
        ibsCbsCst: "000",
        cClassTrib: "000001",
      };
      await tx((c) =>
        saveProductFiscalProfile(c, a, actor.id, product.id, good),
      );
      const saved = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      assert.equal(
        (saved.fiscalProfile as Record<string, string>).icmsCode,
        "102",
      );
      assert.equal(saved.stockQuantity, 20);
      assert.equal(saved.priceCents, 2500);
      assert.equal(saved.costCents, 500);
      assert.deepEqual(saved.stockAggregates, product.stockAggregates);
      assert.equal(await db.stockMovement.count({ where: { arenaId: a } }), 0);
      for (const [id, data, error] of [
        [foreign.id, good, /nesta arena/],
        [service.id, good, /nesta arena/],
        [product.id, { ...good, ncm: "99999999" }, /NCM/],
        [product.id, { ...good, cClassTrib: "000999" }, /Classificação/],
        [product.id, { ...good, icmsCode: "00" }, /CSOSN/],
        [product.id, { ...good, benefitCode: "PR999999" }, /cBenef/],
        [product.id, { ...good, benefitCode: "PR820059" }, /cBenef/],
      ] as const)
        await assert.rejects(
          tx((c) => saveProductFiscalProfile(c, a, actor.id, id, data)),
          error,
        );
      await assert.rejects(
        tx((c) => saveProductFiscalProfile(c, b, actor.id, foreign.id, good)),
        /nesta arena/,
      );
      assert.deepEqual(
        (await db.product.findUniqueOrThrow({ where: { id: product.id } }))
          .fiscalProfile,
        saved.fiscalProfile,
      );
      assert.equal(
        await db.auditEvent.count({
          where: { arenaId: a, action: "PRODUCT_FISCAL_PROFILE_UPDATED" },
        }),
        1,
      );
    } finally {
      await db.auditEvent.deleteMany({ where: { arenaId: { in: ids } } });
      await db.arena.deleteMany({ where: { id: { in: ids } } });
      await db.$disconnect();
    }
  },
);
