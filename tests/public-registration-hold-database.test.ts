import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { releaseExpiredPublicRegistrationHolds } from "../src/lib/tournaments/registration-payment-hold";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("vagas expiradas voltam a ficar disponíveis sem cancelar pagamento ou outra arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const rollback = new Error("rollback das inscrições descartáveis");
  let tournamentAId = "";
  let tournamentBId = "";
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const tournamentA = await admin.tournament.create({ data: { arenaId: arenaA.id, name: "Hold GOAL A", publicSlug: `goal-hold-a-${Date.now()}` } });
    tournamentAId = tournamentA.id;
    const categoryA = await admin.tournamentCategory.create({ data: { tournamentId: tournamentA.id, name: "Categoria A", level: 1 } });
    const tournamentB = await admin.tournament.create({ data: { arenaId: arenaB.id, name: "Hold GOAL B", publicSlug: `goal-hold-b-${Date.now()}` } });
    tournamentBId = tournamentB.id;
    const categoryB = await admin.tournamentCategory.create({ data: { tournamentId: tournamentB.id, name: "Categoria B", level: 1 } });
    const now = new Date("2035-01-02T12:00:00.000Z");
    const expiredAt = new Date(now.getTime() - 60_000);
    const activeUntil = new Date(now.getTime() + 60_000);
    const registrationData = (tournamentId: string, categoryId: string, registrationOrder: number, holdExpiresAt: Date, paymentStatus = "PENDING") => ({
      tournamentId, categoryId, registrationOrder, holdExpiresAt, paymentStatus, status: "PENDING_PAYMENT",
      leadName: "Atleta GOAL", leadPhone: "559999999999", leadCpf: `1111111111${registrationOrder}`,
      leadBirthDate: new Date("1990-01-01"), partnerName: "Parceiro GOAL", partnerPhone: "558888888888",
      partnerCpf: `2222222222${registrationOrder}`, partnerBirthDate: new Date("1991-01-01"), amountCents: 10000,
    });

    await assert.rejects(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const expired = await tx.publicTournamentRegistration.create({ data: registrationData(tournamentA.id, categoryA.id, 1, expiredAt) });
      const active = await tx.publicTournamentRegistration.create({ data: registrationData(tournamentA.id, categoryA.id, 2, activeUntil) });
      const review = await tx.publicTournamentRegistration.create({ data: registrationData(tournamentA.id, categoryA.id, 3, expiredAt, "REVIEW") });
      assert.equal((await releaseExpiredPublicRegistrationHolds(tx, tournamentA.id, now)).count, 1);
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: expired.id } })).status, "CANCELED");
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: active.id } })).status, "PENDING_PAYMENT");
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: review.id } })).status, "PENDING_PAYMENT");
      assert.equal(await tx.publicTournamentRegistration.count({ where: { tournamentId: tournamentA.id, categoryId: categoryA.id, status: { not: "CANCELED" } } }), 2);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      const foreign = await tx.publicTournamentRegistration.create({ data: registrationData(tournamentB.id, categoryB.id, 1, expiredAt) });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await releaseExpiredPublicRegistrationHolds(tx, tournamentB.id, now)).count, 0);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: foreign.id } })).status, "PENDING_PAYMENT");
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    if (tournamentAId) await admin.tournament.delete({ where: { id: tournamentAId } });
    if (tournamentBId) await admin.tournament.delete({ where: { id: tournamentBId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
