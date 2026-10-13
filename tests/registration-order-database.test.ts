import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { lockTournamentRegistrations, nextTournamentRegistrationOrder } from "../src/lib/tournaments/registration-order";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("inscrições simultâneas de CPFs diferentes recebem posições únicas no mesmo torneio", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  let tournamentId: string | undefined;
  try {
    const arenaA = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const tournament = await db.tournament.create({ data: { arenaId: arenaA.id, name: "Ordem GOAL", publicSlug: `goal-order-${Date.now()}` } });
    tournamentId = tournament.id;
    const category = await db.tournamentCategory.create({ data: { tournamentId, name: "Categoria GOAL", level: 1 } });
    const register = async (number: number) => db.$transaction(async (tx) => {
      await lockTournamentRegistrations(tx, tournament.id, arenaA.id);
      const registrationOrder = await nextTournamentRegistrationOrder(tx, tournament.id);
      if (number === 1) await new Promise((resolve) => setTimeout(resolve, 40));
      await tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournament.id, categoryId: category.id, registrationOrder,
        leadName: `Atleta ${number}`, leadPhone: "559999999999", leadCpf: `1111111111${number}`, leadBirthDate: new Date("1990-01-01"),
        partnerName: `Dupla ${number}`, partnerPhone: "558888888888", partnerCpf: `2222222222${number}`, partnerBirthDate: new Date("1991-01-01"),
        amountCents: 10000,
      } });
      return registrationOrder;
    });

    const orders = await Promise.all([register(1), register(2)]);
    assert.deepEqual([...orders].sort((a, b) => a - b), [1, 2]);
    assert.equal(await db.publicTournamentRegistration.count({ where: { tournamentId } }), 2);
    await assert.rejects(db.$transaction((tx) => lockTournamentRegistrations(tx, tournament.id, arenaB.id)), /Torneio não encontrado nesta arena/);
  } finally {
    if (tournamentId) await db.tournament.delete({ where: { id: tournamentId } });
    await db.$disconnect();
  }
});
