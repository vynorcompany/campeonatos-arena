import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { buildMonthlyLeagueSchedule, getLeagueMonthBlocks } from "../src/lib/league/monthly-schedule";
import { leagueReferenceMonth } from "../src/lib/league/reference-month";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

function loadLifecycle(prisma: PrismaClient) {
  const source = readFileSync(new URL("../src/lib/league/lifecycle.ts", import.meta.url), "utf8");
  const exports: {
    closeLeagueCycleManually?: (competitionId: string, now: Date, arenaId: string) => Promise<{ closedCycles: number; nextReferenceMonth: string }>;
    closeExpiredLeagueCycles?: (now: Date, arenaId: string) => Promise<{ closedCycles: number }>;
    reopenEmptyLeagueCycle?: (cycleId: string, arenaId: string, now: Date) => Promise<{ reopenedCycleId: string; scheduledMatches: number }>;
  } = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/league/monthly-schedule") return { buildMonthlyLeagueSchedule, getLeagueMonthBlocks };
      if (name === "@/lib/league/reference-month") return { leagueReferenceMonth };
      if (name === "@/lib/league/tier") return { resolveLeagueTier: (_name: string, tier: string) => tier };
      if (name === "@/lib/arena-database") return { arenaDatabase: () => prisma };
      if (name === "@/lib/rls") return { withArenaTransaction: (_arenaId: string, operation: (tx: unknown) => Promise<unknown>) => prisma.$transaction(operation as Parameters<typeof prisma.$transaction>[0]) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  assert.ok(exports.closeLeagueCycleManually);
  assert.ok(exports.closeExpiredLeagueCycles);
  assert.ok(exports.reopenEmptyLeagueCycle);
  return { close: exports.closeLeagueCycleManually, closeExpired: exports.closeExpiredLeagueCycles, reopen: exports.reopenEmptyLeagueCycle };
}

test("mês sem vitórias não fecha manualmente nem produz campeã ou rebaixamento automático", { skip: !disposableDatabase }, async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const token = randomUUID();
  let userId: string | undefined;
  let arenaId: string | undefined;
  try {
    const user = await prisma.user.create({ data: { name: "Teste Liga", email: `league-no-winner-${token}@example.invalid`, passwordHash: "test-only" } });
    userId = user.id;
    const arena = await prisma.arena.create({ data: { name: "Arena descartável sem vitória", slug: `league-no-winner-${token}`, createdById: user.id } });
    arenaId = arena.id;
    const tournament = await prisma.tournament.create({ data: { name: "Liga descartável", arenaId: arena.id } });
    const categoryA = await prisma.tournamentCategory.create({ data: { name: "Liga A", level: 1, tournamentId: tournament.id } });
    const categoryB = await prisma.tournamentCategory.create({ data: { name: "Liga B", level: 2, tournamentId: tournament.id } });
    const leagueA = await prisma.categoryCompetition.create({ data: { categoryId: categoryA.id, format: "LEAGUE", leagueTier: "A", status: "PUBLISHED" } });
    const leagueB = await prisma.categoryCompetition.create({ data: { categoryId: categoryB.id, format: "LEAGUE", leagueTier: "B", status: "PUBLISHED" } });
    const cycle = await prisma.leagueCycle.create({ data: { competitionId: leagueA.id, referenceMonth: "2026-09" } });
    const first = await prisma.categoryPair.create({ data: { competitionId: leagueA.id, name: "Primeira dupla", drawOrder: 1 } });
    const second = await prisma.categoryPair.create({ data: { competitionId: leagueA.id, name: "Segunda dupla", drawOrder: 2 } });
    const match = await prisma.categoryMatch.create({ data: { competitionId: leagueA.id, leagueCycleId: cycle.id, label: "Jogo agendado", stage: "GROUP", roundOrder: 1, homePairId: first.id, awayPairId: second.id } });
    const { close, closeExpired } = loadLifecycle(prisma);
    const now = new Date("2026-10-13T12:00:00Z");
    await assert.rejects(close(leagueA.id, now, arena.id), /ainda não tem vitórias registradas/);
    assert.equal((await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycle.id } })).status, "OPEN");
    assert.equal((await prisma.categoryMatch.findUniqueOrThrow({ where: { id: match.id } })).woReason, null);
    assert.equal(await prisma.categoryPair.count({ where: { competitionId: leagueA.id } }), 2);
    assert.equal(await prisma.leagueCycle.count({ where: { competitionId: leagueA.id } }), 1);

    assert.equal((await closeExpired(now, arena.id)).closedCycles, 1);
    const closed = await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycle.id } });
    assert.equal(closed.status, "CLOSED");
    assert.equal(closed.championPairId, null);
    assert.equal(closed.relegatedPairId, null);
    assert.equal(closed.promotedPairId, null);
    assert.equal(await prisma.categoryPair.count({ where: { competitionId: leagueB.id } }), 0);
  } finally {
    if (arenaId) {
      const inArena = { competition: { category: { tournament: { arenaId } } } };
      await prisma.categoryMatch.deleteMany({ where: inArena });
      await prisma.categoryPair.deleteMany({ where: inArena });
      await prisma.arena.delete({ where: { id: arenaId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});

for (const order of [["A", "B"], ["B", "A"]] as const) {
  test(`fechar Liga ${order.join("→")} preserva as duplas transferidas para o próximo mês`, { skip: !disposableDatabase }, async () => {
    const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
    const token = randomUUID();
    let userId: string | undefined;
    let arenaId: string | undefined;
    try {
      const user = await prisma.user.create({ data: { name: "Teste Liga", email: `league-close-${token}@example.invalid`, passwordHash: "test-only" } });
      userId = user.id;
      const arena = await prisma.arena.create({ data: { name: "Arena descartável Liga", slug: `league-close-${token}`, createdById: user.id } });
      arenaId = arena.id;
      const tournament = await prisma.tournament.create({ data: { name: "Liga descartável", arenaId: arena.id } });
      const competitions: Record<"A" | "B", string> = { A: "", B: "" };
      const cycles: Record<"A" | "B", string> = { A: "", B: "" };
      const pairs: Record<"A" | "B", string[]> = { A: [], B: [] };
      for (const tier of ["A", "B"] as const) {
        const category = await prisma.tournamentCategory.create({ data: { name: tier, level: tier === "A" ? 1 : 2, tournamentId: tournament.id } });
        const competition = await prisma.categoryCompetition.create({ data: { categoryId: category.id, format: "LEAGUE", leagueTier: tier, status: "PUBLISHED" } });
        competitions[tier] = competition.id;
        const cycle = await prisma.leagueCycle.create({ data: { competitionId: competition.id, referenceMonth: "2026-09" } });
        cycles[tier] = cycle.id;
        for (let pairNumber = 1; pairNumber <= 2; pairNumber += 1) {
          const pair = await prisma.categoryPair.create({ data: { competitionId: competition.id, name: `${tier}${pairNumber}`, drawOrder: pairNumber } });
          pairs[tier].push(pair.id);
          const players = await Promise.all([1, 2].map((number) => prisma.player.create({ data: { arenaId: arena.id, name: `${tier}${pairNumber}-${number}` } })));
          await prisma.categoryPairPlayer.createMany({ data: players.map((player, index) => ({ pairId: pair.id, competitionId: competition.id, playerId: player.id, slot: index + 1 })) });
        }
        await prisma.categoryMatch.create({ data: {
          competitionId: competition.id, leagueCycleId: cycle.id, label: `${tier} descartável`, stage: "GROUP", roundOrder: 1,
          homePairId: pairs[tier][0], awayPairId: pairs[tier][1], winnerPairId: pairs[tier][0], homeScore: 2, awayScore: 0, manualStatus: "FINISHED",
        } });
      }

      const { close, reopen } = loadLifecycle(prisma);
      await assert.rejects(close(competitions.A, new Date("2026-10-13T12:00:00Z"), "outra-arena"), /Não há um ciclo aberto/);
      assert.equal((await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycles.A } })).status, "OPEN");
      for (const [index, tier] of order.entries()) {
        const result = await close(competitions[tier], new Date("2026-10-13T12:00:00Z"), arena.id);
        assert.equal(result.closedCycles, 1);
        assert.equal(result.nextReferenceMonth, "2026-10");
        assert.equal((await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycles[tier] } })).status, "CLOSED");
        assert.ok(await prisma.leagueCycle.findUnique({ where: { competitionId_referenceMonth: { competitionId: competitions[tier], referenceMonth: "2026-10" } } }));
        if (index === 0) {
          const destination = tier === "A" ? "B" : "A";
          const incoming = await prisma.categoryPair.findFirstOrThrow({
            where: { competitionId: competitions[destination], name: tier === "A" ? "A2" : "B1" },
          });
          assert.equal(incoming.active, false);
          assert.equal(incoming.pendingLeagueTransfer, true);
        }
      }

      const promoted = await prisma.categoryPair.findFirst({ where: { competitionId: competitions.A, name: "B1", active: true } });
      const relegated = await prisma.categoryPair.findFirst({ where: { competitionId: competitions.B, name: "A2", active: true } });
      assert.ok(promoted, "a campeã da B deve permanecer na A");
      assert.ok(relegated, "a rebaixada da A deve permanecer na B");
      assert.equal(promoted.pendingLeagueTransfer, false);
      assert.equal(relegated.pendingLeagueTransfer, false);
      assert.equal(await prisma.categoryPairPlayer.count({ where: { pairId: promoted.id } }), 2);
      assert.equal(await prisma.categoryPairPlayer.count({ where: { pairId: relegated.id } }), 2);
      const destinationSnapshot = (await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycles[order[1]] } })).snapshot as { pairs: Array<{ name: string }> };
      assert.equal(destinationSnapshot.pairs.some((pair) => pair.name === (order[0] === "A" ? "A2" : "B1")), false);
      await assert.rejects(reopen(cycles.A, arena.id, new Date("2026-09-13T12:00:00Z")), /dados históricos ou transferências/);
    } finally {
      if (arenaId) {
        const inArena = { competition: { category: { tournament: { arenaId } } } };
        await prisma.categoryMatch.deleteMany({ where: inArena });
        await prisma.categoryPairPlayer.deleteMany({ where: { pair: inArena } });
        await prisma.categoryPair.deleteMany({ where: inArena });
        await prisma.arena.delete({ where: { id: arenaId } });
      }
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await prisma.$disconnect();
    }
  });
}

test("reabre apenas o ciclo vazio mais recente e preserva a arena", { skip: !disposableDatabase }, async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const token = randomUUID();
  let userId: string | undefined;
  let arenaId: string | undefined;
  try {
    const user = await prisma.user.create({ data: { name: "Teste Liga", email: `league-reopen-${token}@example.invalid`, passwordHash: "test-only" } });
    userId = user.id;
    const arena = await prisma.arena.create({ data: { name: "Arena descartável reabertura", slug: `league-reopen-${token}`, createdById: user.id } });
    arenaId = arena.id;
    const tournament = await prisma.tournament.create({ data: { name: "Liga descartável", arenaId: arena.id } });
    const category = await prisma.tournamentCategory.create({ data: { name: "Liga A", level: 1, tournamentId: tournament.id } });
    const competition = await prisma.categoryCompetition.create({ data: { categoryId: category.id, format: "LEAGUE", leagueTier: "A", status: "PUBLISHED" } });
    const cycle = await prisma.leagueCycle.create({ data: { competitionId: competition.id, referenceMonth: "2026-10" } });
    const { close, reopen } = loadLifecycle(prisma);
    await close(competition.id, new Date("2026-10-13T12:00:00Z"), arena.id);
    const successor = await prisma.leagueCycle.findUniqueOrThrow({ where: { competitionId_referenceMonth: { competitionId: competition.id, referenceMonth: "2026-11" } } });
    for (const name of ["Dupla 1", "Dupla 2"]) await prisma.categoryPair.create({ data: { competitionId: competition.id, name } });

    await assert.rejects(reopen(cycle.id, "outra-arena", new Date("2026-10-13T12:00:00Z")), /não encontrado nesta arena/);
    await assert.rejects(reopen(cycle.id, arena.id, new Date("2026-11-02T12:00:00Z")), /mês atual/);
    const blocker = await prisma.categoryMatch.create({ data: { competitionId: competition.id, leagueCycleId: successor.id, label: "Jogo novo", stage: "GROUP", roundOrder: 1 } });
    await assert.rejects(reopen(cycle.id, arena.id, new Date("2026-10-13T12:00:00Z")), /ciclo seguinte já possui atividade/);
    await prisma.categoryMatch.delete({ where: { id: blocker.id } });

    const result = await reopen(cycle.id, arena.id, new Date("2026-10-13T12:00:00Z"));
    assert.equal(result.reopenedCycleId, cycle.id);
    assert.equal(result.scheduledMatches, 1);
    assert.equal((await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycle.id } })).status, "OPEN");
    assert.equal(await prisma.leagueCycle.count({ where: { id: successor.id } }), 0);
    assert.equal((await prisma.categoryCompetition.findUniqueOrThrow({ where: { id: competition.id } })).status, "PUBLISHED");
    const reopenedMatch = await prisma.categoryMatch.findFirstOrThrow({ where: { leagueCycleId: cycle.id } });
    assert.ok(reopenedMatch.hostProposalDeadline && reopenedMatch.hostProposalDeadline > new Date("2026-10-20T11:00:00Z"));
    await assert.rejects(reopen(cycle.id, arena.id, new Date("2026-10-13T12:00:00Z")), /Ciclo encerrado não encontrado/);
  } finally {
    if (arenaId) {
      const inArena = { competition: { category: { tournament: { arenaId } } } };
      await prisma.categoryMatch.deleteMany({ where: inArena });
      await prisma.categoryPair.deleteMany({ where: inArena });
      await prisma.arena.delete({ where: { id: arenaId } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
