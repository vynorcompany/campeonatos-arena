import { PrismaClient } from "@prisma/client";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const url = new URL(testUrl);
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55433" ||
  url.pathname !== "/arena_goal" ||
  url.username !== "postgres" ||
  process.env.DATABASE_URL !== testUrl ||
  process.env.DIRECT_URL !== testUrl
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
    const arenaA = await db.arena.create({ data: { name: "Arena Teste GOAL", slug: "arena-teste-goal", createdById: owner.id } });
    const arenaB = await db.arena.create({ data: { name: "Arena Beta GOAL", slug: "arena-beta-goal", createdById: owner.id } });
    await db.arenaMember.createMany({ data: [
      { arenaId: arenaA.id, userId: owner.id, role: "OWNER" },
      { arenaId: arenaB.id, userId: owner.id, role: "OWNER" },
    ] });

    const athlete = await db.player.create({ data: { id: "goal-athlete-a", arenaId: arenaA.id, name: "Atleta GOAL A" } });
    await db.player.create({ data: { arenaId: arenaB.id, name: "Atleta Exclusivo Outra Arena GOAL" } });
    const court = await db.court.create({ data: { id: "goal-court-a", arenaId: arenaA.id, name: "Quadra GOAL 1" } });
    await db.courtWeeklyRule.create({ data: { courtId: court.id, weekday: 1, startsAtMinute: 420, endsAtMinute: 480, priceCents: 10000 } });
    const product = await db.product.create({ data: { arenaId: arenaA.id, name: "Produto GOAL", priceCents: 1200, stockQuantity: 10 } });
    const comanda = await db.comanda.create({ data: { id: "goal-fixture-comanda", arenaId: arenaA.id, playerId: athlete.id, code: "GOAL-COMANDA", label: "Comanda GOAL" } });
    await db.comandaItem.create({ data: { comandaId: comanda.id, productId: product.id, unitPriceCents: 1200, totalCents: 1200 } });
    const booking = await db.scheduleOccurrence.create({ data: { id: "goal-fixture-occurrence", arenaId: arenaA.id, sourceType: "COURT_BOOKING", title: "Reserva GOAL", startsAt: new Date("2020-01-03T10:00:00.000Z"), endsAt: new Date("2020-01-03T11:00:00.000Z") } });
    await db.scheduleParticipant.create({ data: { occurrenceId: booking.id, playerId: athlete.id } });
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
