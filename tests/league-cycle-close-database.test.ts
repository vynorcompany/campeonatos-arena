import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { buildMonthlyLeagueSchedule, getLeagueMonthBlocks } from "../src/lib/league/monthly-schedule";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

function loadManualClose(prisma: PrismaClient) {
  const source = readFileSync(new URL("../src/lib/league/lifecycle.ts", import.meta.url), "utf8");
  const exports: { closeLeagueCycleManually?: (competitionId: string, now: Date, arenaId: string) => Promise<{ closedCycles: number; nextReferenceMonth: string }> } = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/league/monthly-schedule") return { buildMonthlyLeagueSchedule, getLeagueMonthBlocks };
      if (name === "@/lib/league/tier") return { resolveLeagueTier: (_name: string, tier: string) => tier };
      if (name === "@/lib/arena-database") return { arenaDatabase: () => prisma };
      if (name === "@/lib/rls") return { withArenaTransaction: (_arenaId: string, operation: (tx: unknown) => Promise<unknown>) => prisma.$transaction(operation as Parameters<typeof prisma.$transaction>[0]) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  assert.ok(exports.closeLeagueCycleManually);
  return exports.closeLeagueCycleManually;
}

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

      const close = loadManualClose(prisma);
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
