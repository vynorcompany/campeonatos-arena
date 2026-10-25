import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

function loadPromotion(prisma: PrismaClient) {
  const source = `${readFileSync(new URL("../src/lib/league/lifecycle.ts", import.meta.url), "utf8")}\nexports.__applyPromotionAndRelegation = applyPromotionAndRelegation;\nexports.__applyWo = applyWo;`;
  const exports: {
    __applyPromotionAndRelegation?: (cycleId: string) => Promise<void>;
    __applyWo?: (matchId: string, winnerPairId: string | null, reason: string) => Promise<void>;
  } = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/league/monthly-schedule") return {};
      if (name === "@/lib/league/reference-month") return {};
      if (name === "@/lib/league/tier") return { resolveLeagueTier: (_name: string, tier: string) => tier };
      if (name === "@/lib/arena-database") return {};
      if (name === "@/lib/rls") return { withArenaTransaction: (arenaId: string, operation: (tx: any) => Promise<unknown>) => prisma.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  assert.ok(exports.__applyPromotionAndRelegation);
  assert.ok(exports.__applyWo);
  return { promote: exports.__applyPromotionAndRelegation, applyWo: exports.__applyWo };
}

test("ciclo da Liga transfere a dupla rebaixada e não repete a penalidade de WO", { skip: !disposableDatabase }, async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const token = randomUUID();
  let userId: string | undefined;
  let arenaId: string | undefined;
  try {
    const user = await prisma.user.create({ data: { name: "Teste Liga", email: `league-${token}@example.invalid`, passwordHash: "test-only" } });
    userId = user.id;
    const arena = await prisma.arena.create({ data: { name: "Arena descartável Liga", slug: `league-${token}`, createdById: user.id } });
    arenaId = arena.id;
    const tournament = await prisma.tournament.create({ data: { name: "Liga descartável", arenaId: arena.id } });
    const categoryA = await prisma.tournamentCategory.create({ data: { name: "A", level: 1, tournamentId: tournament.id } });
    const categoryB = await prisma.tournamentCategory.create({ data: { name: "B", level: 2, tournamentId: tournament.id } });
    const competitionA = await prisma.categoryCompetition.create({ data: { categoryId: categoryA.id, format: "LEAGUE", leagueTier: "A" } });
    const competitionB = await prisma.categoryCompetition.create({ data: { categoryId: categoryB.id, format: "LEAGUE", leagueTier: "B" } });
    const cycle = await prisma.leagueCycle.create({ data: { competitionId: competitionA.id, referenceMonth: "2026-09" } });
    const players = await Promise.all([1, 2, 3, 4].map((number) => prisma.player.create({ data: { arenaId: arena.id, name: `Atleta ${number}` } })));
    const winningPair = await prisma.categoryPair.create({ data: { competitionId: competitionA.id, name: "Dupla campeã" } });
    const losingPair = await prisma.categoryPair.create({ data: { competitionId: competitionA.id, name: "Dupla rebaixada" } });
    await prisma.categoryPairPlayer.createMany({ data: [
      { pairId: winningPair.id, competitionId: competitionA.id, playerId: players[0].id, slot: 1 },
      { pairId: winningPair.id, competitionId: competitionA.id, playerId: players[1].id, slot: 2 },
      { pairId: losingPair.id, competitionId: competitionA.id, playerId: players[2].id, slot: 1 },
      { pairId: losingPair.id, competitionId: competitionA.id, playerId: players[3].id, slot: 2 },
    ] });
    await prisma.categoryMatch.create({ data: {
      competitionId: competitionA.id, leagueCycleId: cycle.id, label: "Final descartável", stage: "LEAGUE", roundOrder: 1,
      homePairId: winningPair.id, awayPairId: losingPair.id, winnerPairId: winningPair.id, homeScore: 2, awayScore: 0,
    } });

    const league = loadPromotion(prisma);
    await league.promote(cycle.id);

    const moved = await prisma.categoryPair.findFirst({ where: { competitionId: competitionB.id, active: true }, include: { players: { orderBy: { slot: "asc" } } } });
    assert.equal(moved?.name, "Dupla rebaixada");
    assert.deepEqual(moved?.players.map((player) => player.playerId), [players[2].id, players[3].id]);
    assert.equal((await prisma.categoryPair.findUniqueOrThrow({ where: { id: losingPair.id } })).active, false);
    assert.equal((await prisma.leagueCycle.findUniqueOrThrow({ where: { id: cycle.id } })).relegatedPairId, losingPair.id);

    const missed = await prisma.categoryMatch.create({ data: {
      competitionId: competitionA.id, leagueCycleId: cycle.id, label: "WO descartável", stage: "LEAGUE", roundOrder: 2,
      homePairId: winningPair.id, awayPairId: losingPair.id,
    } });
    await league.applyWo(missed.id, null, "DOUBLE_WO");
    await league.applyWo(missed.id, null, "DOUBLE_WO");
    await league.applyWo(missed.id, winningPair.id, "HOST_NO_PROPOSAL");
    assert.equal((await prisma.categoryPair.findUniqueOrThrow({ where: { id: winningPair.id } })).totalPoints, -2);
    assert.equal((await prisma.categoryPair.findUniqueOrThrow({ where: { id: losingPair.id } })).totalPoints, -2);
    const finishedWo = await prisma.categoryMatch.findUniqueOrThrow({ where: { id: missed.id } });
    assert.equal(finishedWo.woReason, "DOUBLE_WO");
    assert.equal(finishedWo.winnerPairId, null);
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
