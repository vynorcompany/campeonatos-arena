import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(databaseUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("inscrições públicas só podem ser lidas e alteradas pela arena do torneio", { skip: !disposableDatabase }, async () => {
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  let tournamentId: string | undefined;
  let otherTournamentId: string | undefined;
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const tournament = await admin.tournament.create({ data: { arenaId: arenaA.id, name: "Isolamento GOAL", publicSlug: `goal-rls-${Date.now()}` } });
    tournamentId = tournament.id;
    const category = await admin.tournamentCategory.create({ data: { tournamentId, name: "Categoria GOAL", level: 1 } });
    const otherTournament = await admin.tournament.create({ data: { arenaId: arenaB.id, name: "Outra arena GOAL", publicSlug: `goal-rls-other-${Date.now()}` } });
    otherTournamentId = otherTournament.id;
    const otherCategory = await admin.tournamentCategory.create({ data: { tournamentId: otherTournament.id, name: "Categoria externa GOAL", level: 1 } });

    const registration = await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      return tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournament.id, categoryId: category.id, registrationOrder: 1,
        leadName: "Atleta GOAL", leadPhone: "559999999999", leadCpf: "11111111111", leadBirthDate: new Date("1990-01-01"),
        partnerName: "Parceiro GOAL", partnerPhone: "558888888888", partnerCpf: "22222222222", partnerBirthDate: new Date("1991-01-01"),
        amountCents: 10000,
      } });
    });

    assert.equal(await runtime.publicTournamentRegistration.findFirst({ where: { id: registration.id } }), null);
    await assert.rejects(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      return tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournament.id, categoryId: category.id, registrationOrder: 2,
        leadName: "Intruso", leadPhone: "559999999998", leadCpf: "33333333333", leadBirthDate: new Date("1990-01-01"),
        partnerName: "Intruso", partnerPhone: "558888888887", partnerCpf: "44444444444", partnerBirthDate: new Date("1991-01-01"),
        amountCents: 10000,
      } });
    }), /42501|row-level security|segurança no nível de linha/);
    await assert.rejects(runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      return tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournament.id, categoryId: otherCategory.id, registrationOrder: 2,
        leadName: "Categoria externa", leadPhone: "559999999998", leadCpf: "33333333333", leadBirthDate: new Date("1990-01-01"),
        partnerName: "Categoria externa", partnerPhone: "558888888887", partnerCpf: "44444444444", partnerBirthDate: new Date("1991-01-01"),
        amountCents: 10000,
      } });
    }), /42501|row-level security|segurança no nível de linha/);
    const malformed = await admin.publicTournamentRegistration.create({ data: {
      tournamentId: tournament.id, categoryId: otherCategory.id, registrationOrder: 3,
      leadName: "Legado externo", leadPhone: "559999999997", leadCpf: "55555555555", leadBirthDate: new Date("1990-01-01"),
      partnerName: "Legado externo", partnerPhone: "558888888886", partnerCpf: "66666666666", partnerBirthDate: new Date("1991-01-01"),
      amountCents: 10000,
    } });

    await runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.publicTournamentRegistration.findFirst({ where: { id: registration.id } }), null);
      assert.equal((await tx.publicTournamentRegistration.updateMany({ where: { id: registration.id }, data: { leadName: "Invadido" } })).count, 0);
      const foreignTournament = await tx.tournament.findUnique({ where: { id: tournamentId }, include: { publicRegistrations: true } });
      assert.equal(foreignTournament?.publicRegistrations.length, 0);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await tx.publicTournamentRegistration.findFirst({ where: { id: registration.id } }))?.leadName, "Atleta GOAL");
      assert.equal(await tx.publicTournamentRegistration.findFirst({ where: { id: malformed.id } }), null);
      const ownedTournament = await tx.tournament.findUnique({ where: { id: tournamentId }, include: { publicRegistrations: true } });
      assert.equal(ownedTournament?.publicRegistrations.length, 1);
    });
  } finally {
    if (tournamentId) await admin.tournament.delete({ where: { id: tournamentId } });
    if (otherTournamentId) await admin.tournament.delete({ where: { id: otherTournamentId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
