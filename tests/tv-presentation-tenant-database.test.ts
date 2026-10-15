import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch {
    return false;
  }
})();

test("TV presentation data is isolated by arena for the runtime role", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback TV tenant fixture");
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      assert.equal(await tx.manualUpcomingMatch.count(), 0);
      assert.equal(await tx.tvPresentationSettings.count(), 0);
      assert.equal(await tx.tvSponsor.count(), 0);
      assert.equal(await tx.sponsorshipPlan.count(), 0);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const planA = await tx.sponsorshipPlan.create({ data: { arenaId: arenaA.id, name: "GOAL TV A" } });
      const matchA = await tx.manualUpcomingMatch.create({ data: { arenaId: arenaA.id, displayOrder: 1, homePairName: "Teste A" } });
      const settingsA = await tx.tvPresentationSettings.create({ data: { arenaId: arenaA.id, slideIntervalSeconds: 10 } });
      const sponsorA = await tx.tvSponsor.create({ data: { arenaId: arenaA.id, name: "Teste A", sponsorshipPlanId: planA.id } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const planB = await tx.sponsorshipPlan.create({ data: { arenaId: arenaB.id, name: "GOAL TV B" } });
      const matchB = await tx.manualUpcomingMatch.create({ data: { arenaId: arenaB.id, displayOrder: 1, homePairName: "Teste B" } });
      const settingsB = await tx.tvPresentationSettings.create({ data: { arenaId: arenaB.id, slideIntervalSeconds: 15 } });
      const sponsorB = await tx.tvSponsor.create({ data: { arenaId: arenaB.id, name: "Teste B", sponsorshipPlanId: planB.id } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.deepEqual((await tx.manualUpcomingMatch.findMany({ select: { id: true } })).map((row) => row.id), [matchA.id]);
      assert.equal((await tx.tvPresentationSettings.findUnique({ where: { arenaId: arenaA.id } }))?.id, settingsA.id);
      assert.equal(await tx.tvPresentationSettings.findUnique({ where: { arenaId: arenaB.id } }), null);
      const updatedSettings = await tx.tvPresentationSettings.upsert({ where: { arenaId: arenaA.id }, create: { arenaId: arenaA.id, slideIntervalSeconds: 12 }, update: { slideIntervalSeconds: 12 } });
      assert.equal(updatedSettings.slideIntervalSeconds, 12);
      assert.deepEqual((await tx.tvSponsor.findMany({ select: { id: true } })).map((row) => row.id), [sponsorA.id]);
      assert.deepEqual((await tx.tvSponsor.findMany({ where: { arenaId: arenaA.id, sponsorshipPlanId: { not: null } }, select: { id: true } })).map((row) => row.id), [sponsorA.id]);
      assert.deepEqual((await tx.sponsorshipPlan.findUniqueOrThrow({ where: { id: planA.id }, include: { sponsors: { select: { id: true } } } })).sponsors.map((row) => row.id), [sponsorA.id]);
      assert.equal(await tx.sponsorshipPlan.findUnique({ where: { id: planB.id } }), null);
      assert.equal((await tx.manualUpcomingMatch.updateMany({ where: { id: matchB.id }, data: { homePairName: "Invasão" } })).count, 0);
      assert.equal((await tx.tvSponsor.deleteMany({ where: { id: sponsorB.id } })).count, 0);
      assert.equal((await tx.tvPresentationSettings.updateMany({ where: { id: settingsB.id }, data: { slideIntervalSeconds: 20 } })).count, 0);
      assert.equal((await tx.sponsorshipPlan.deleteMany({ where: { id: planB.id } })).count, 0);
      assert.equal((await tx.sponsorshipPlan.deleteMany({ where: { id: planA.id } })).count, 1);
      assert.equal((await tx.tvSponsor.findUniqueOrThrow({ where: { id: sponsorA.id } })).sponsorshipPlanId, null);
      throw rollback;
    }), (error: unknown) => error === rollback);

    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.tvSponsor.create({ data: { arenaId: arenaB.id, name: "Cross-tenant" } });
    }), /42501|row-level security|segurança no nível de linha/);
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.sponsorshipPlan.create({ data: { arenaId: arenaB.id, name: "Cross-tenant" } });
    }), /42501|row-level security|segurança no nível de linha/);
  } finally {
    await db.$disconnect();
  }
});
