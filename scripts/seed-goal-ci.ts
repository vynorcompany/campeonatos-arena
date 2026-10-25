import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const testSessionToken = process.env.ARENA_GOAL_TEST_SESSION_TOKEN ?? "";
const url = new URL(testUrl);
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55433" ||
  (url.pathname !== "/arena_goal" && !(process.env.ARENA_VISUAL_LOCAL === "true" && url.pathname === "/arena_goal_visual")) ||
  url.username !== "postgres" ||
  process.env.DATABASE_URL !== testUrl ||
  process.env.DIRECT_URL !== testUrl ||
  !/^[a-f0-9]{40}$/i.test(testSessionToken)
) {
  throw new Error("A carga de testes só pode usar o banco local descartável arena_goal.");
}

async function main() {
  const db = new PrismaClient();
  try {
    if ((await db.user.count()) !== 0 || (await db.arena.count()) !== 0) {
      throw new Error("A carga de testes exige um banco recém-criado e vazio.");
    }

    // The CI database is isolated; the application role needs LOGIN for direct RLS tests.
    await db.$executeRawUnsafe("ALTER ROLE arena_runtime LOGIN");

    const owner = await db.user.create({ data: { id: "goal-test", name: "Operador GOAL", email: "goal-owner@example.test", passwordHash: "test-only", systemRole: "SUPER_ADMIN" } });
    await db.session.create({ data: { userId: owner.id, token: createHash("sha256").update(testSessionToken).digest("hex"), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const arenaA = await db.arena.create({ data: { name: "Arena Teste GOAL", slug: "arena-teste-goal", createdById: owner.id } });
    const arenaB = await db.arena.create({ data: { name: "Arena Beta GOAL", slug: "arena-beta-goal", createdById: owner.id } });
    await db.arenaMember.createMany({ data: [
      { arenaId: arenaA.id, userId: owner.id, role: "OWNER" },
      { arenaId: arenaB.id, userId: owner.id, role: "OWNER" },
    ] });
    const staff = await db.user.create({ data: {
      name: "Administrador GOAL",
      email: "goal-staff@example.test",
      passwordHash: await bcrypt.hash("SenhaDescartavelGOAL123!", 10),
      systemRole: "VIEWER"
    } });
    const staffProfile = await db.permissionProfile.create({ data: {
      arenaId: arenaA.id,
      name: "Administrador de teste",
      viewPermissions: ["dashboard", "players", "support"],
      editPermissions: ["support"]
    } });
    await db.arenaMember.create({ data: {
      arenaId: arenaA.id,
      userId: staff.id,
      role: "ADMIN",
      permissionProfileId: staffProfile.id,
      viewPermissions: staffProfile.viewPermissions,
      editPermissions: staffProfile.editPermissions
    } });

    const athlete = await db.player.create({ data: { id: "goal-athlete-a", arenaId: arenaA.id, name: "Atleta GOAL A" } });
    await db.player.create({ data: { arenaId: arenaB.id, name: "Atleta Exclusivo Outra Arena GOAL" } });
    const athleteAccount = await db.playerAccount.create({ data: {
      arenaId: arenaA.id,
      playerId: athlete.id,
      phone: "5500000000000",
      passwordHash: "test-only",
    } });
    const athleteToken = createHash("sha256").update(`goal-player:${testSessionToken}`).digest("hex");
    await db.playerSession.create({ data: {
      playerAccountId: athleteAccount.id,
      token: createHash("sha256").update(athleteToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    } });
    const teacher = await db.teacher.create({ data: { arenaId: arenaA.id, name: "Professora de Nome Comprido GOAL" } });
    const classGroup = await db.classGroup.create({ data: {
      arenaId: arenaA.id,
      teacherId: teacher.id,
      name: "Turma GOAL Iniciante - Manhã",
    } });
    await db.classGroupSchedule.createMany({ data: [
      { arenaId: arenaA.id, classGroupId: classGroup.id, weekday: 1, startTime: "07:30", capacity: 4 },
      { arenaId: arenaA.id, classGroupId: classGroup.id, weekday: 3, startTime: "07:30", capacity: 4 },
    ] });
    const otherTeacher = await db.teacher.create({ data: { arenaId: arenaB.id, name: "Professor Exclusivo Outra Arena GOAL" } });
    await db.classGroup.create({ data: {
      arenaId: arenaB.id,
      teacherId: otherTeacher.id,
      name: "Turma Exclusiva Outra Arena GOAL",
    } });
    const court = await db.court.create({ data: { id: "goal-court-a", arenaId: arenaA.id, name: "Quadra GOAL 1" } });
    await db.courtWeeklyRule.create({ data: { courtId: court.id, weekday: 1, startsAtMinute: 420, endsAtMinute: 480, priceCents: 10000 } });
    const bookingCourt = await db.court.create({ data: { arenaId: arenaA.id, name: "Quadra GOAL Agenda", displayOrder: 1 } });
    await db.courtWeeklyRule.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({
      courtId: bookingCourt.id, weekday, startsAtMinute: 420, endsAtMinute: 1320, priceCents: 10000,
    })) });
    const league = await db.tournament.create({ data: { arenaId: arenaA.id, name: "Liga GOAL", status: "PUBLISHED" } });
    const category = await db.tournamentCategory.create({ data: { tournamentId: league.id, name: "Liga A GOAL", level: 1 } });
    const competition = await db.categoryCompetition.create({ data: { categoryId: category.id, format: "LEAGUE", status: "PUBLISHED", isPublic: true, leagueTier: "A" } });
    const partnerNames = ["Parceira de Nome Comprido GOAL", "Beatriz GOAL", "Carolina GOAL", "Daniela GOAL", "Ester GOAL", "Fernanda GOAL", "Gabriela GOAL"];
    const partners = await Promise.all(partnerNames.map((name) => db.player.create({ data: { arenaId: arenaA.id, name } })));
    const pairPlayers = [[athlete, partners[0]], [partners[1], partners[2]], [partners[3], partners[4]], [partners[5], partners[6]]];
    const leaguePairs: { id: string }[] = [];
    for (const [index, players] of pairPlayers.entries()) {
      const pair = await db.categoryPair.create({ data: { competitionId: competition.id, name: players.map((player) => player.name).join(" / "), drawOrder: index + 1 } });
      await db.categoryPairPlayer.createMany({ data: players.map((player, slot) => ({ competitionId: competition.id, pairId: pair.id, playerId: player.id, slot: slot + 1 })) });
      leaguePairs.push(pair);
    }
    const referenceMonth = new Date().toISOString().slice(0, 7);
    const cycle = await db.leagueCycle.create({ data: { competitionId: competition.id, referenceMonth } });
    const matchPairs = [[0, 1], [0, 2], [3, 0], [1, 2]];
    await db.categoryMatch.createMany({ data: matchPairs.map(([home, away], index) => ({
      competitionId: competition.id, leagueCycleId: cycle.id, leagueBlock: index + 1,
      label: `Semana ${index + 1}`, stage: "LEAGUE", roundOrder: index + 1,
      homePairId: leaguePairs[home].id, awayPairId: leaguePairs[away].id,
      scheduledDate: `${referenceMonth}-${String(3 + index * 7).padStart(2, "0")}`, scheduledTime: "19:00",
      ...(index === 0 ? { homeScore: 2, awayScore: 0, homeSet1: 6, awaySet1: 2, homeSet2: 6, awaySet2: 3, manualStatus: "FINISHED", winnerPairId: leaguePairs[home].id } : {}),
    })) });
    const product = await db.product.create({ data: { arenaId: arenaA.id, name: "Produto GOAL", priceCents: 1200, stockQuantity: 10 } });
    const comanda = await db.comanda.create({ data: { id: "goal-fixture-comanda", arenaId: arenaA.id, playerId: athlete.id, code: "GOAL-COMANDA", label: "Comanda GOAL" } });
    await db.comandaItem.create({ data: { comandaId: comanda.id, productId: product.id, unitPriceCents: 1200, totalCents: 1200 } });
    const booking = await db.scheduleOccurrence.create({ data: { id: "goal-fixture-occurrence", arenaId: arenaA.id, sourceType: "COURT_BOOKING", title: "Reserva GOAL", startsAt: new Date("2020-01-03T10:00:00.000Z"), endsAt: new Date("2020-01-03T11:00:00.000Z") } });
    await db.scheduleParticipant.create({ data: { occurrenceId: booking.id, playerId: athlete.id } });
    const futureStartsAt = new Date(Date.now() + 3 * 24 * 60 * 60_000);
    const futureReservation = await db.scheduleOccurrence.create({ data: { arenaId: arenaA.id, sourceType: "COURT_BOOKING", title: "Próxima reserva GOAL", startsAt: futureStartsAt, endsAt: new Date(futureStartsAt.getTime() + 60 * 60_000) } });
    await db.scheduleOccurrenceCourt.create({ data: { occurrenceId: futureReservation.id, courtId: bookingCourt.id } });
    await db.scheduleParticipant.create({ data: { occurrenceId: futureReservation.id, playerId: athlete.id } });
    const cancellationDates = [5, 6].map((days, index) => {
      const startsAt = new Date(Date.now() + days * 24 * 60 * 60_000);
      startsAt.setUTCHours(16 + index, 0, 0, 0);
      return { startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000) };
    });
    for (const [index, booking] of cancellationDates.entries()) {
      const id = index === 0 ? "goal-cancel-keep" : "goal-cancel-void";
      await db.scheduleOccurrence.create({ data: { id, arenaId: arenaA.id, sourceType: "COURT_BOOKING", title: `Reserva cancelamento GOAL ${index === 0 ? "manter" : "cancelar"}`, ...booking } });
      await db.scheduleOccurrenceCourt.create({ data: { occurrenceId: id, courtId: bookingCourt.id } });
      await db.financialEntry.create({ data: { id: `${id}-charge`, arenaId: arenaA.id, playerId: athlete.id, type: "REVENUE", category: "Reserva", description: `Cobrança cancelamento GOAL ${index === 0 ? "manter" : "cancelar"}`, source: "SCHEDULE_BOOKING", externalReference: id, amountCents: 5000 } });
    }
    await db.financialEntry.createMany({ data: [
      { arenaId: arenaA.id, playerId: athlete.id, type: "REVENUE", category: "Reserva", description: "Receita GOAL", amountCents: 1200 },
      { arenaId: arenaB.id, type: "REVENUE", category: "Reserva", description: "Receita beta GOAL", amountCents: 1200 },
    ] });
    await db.tournament.create({ data: { arenaId: arenaB.id, name: "Torneio Local GOAL B" } });
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
