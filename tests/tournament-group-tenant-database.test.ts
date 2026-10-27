import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { Prisma, PrismaClient } from "@prisma/client";
import ts from "typescript";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("geração e recálculo de torneio respeitam a arena ativa", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: testUrl.replace("postgres@", "arena_runtime@") } } });
  let createdTournamentId = "";
  try {
    const source = readFileSync(new URL("../src/lib/services/tournament.ts", import.meta.url), "utf8");
    const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
    const require = createRequire(import.meta.url);
    let transactionCount = 0;
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports,
      require: (name: string) => {
        if (name === "@/lib/prisma") return { prisma: admin };
        if (name === "@/lib/services/tournament-queries") return {};
        if (name === "@/lib/arena-database") return {};
        if (name === "@/lib/rls") return { withArenaTransaction: async (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
          transactionCount += 1;
          return runtime.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
            return operation(tx);
          });
        } };
        if (name === "@/lib/services/balancing") return require("../src/lib/services/balancing.ts");
        return require(name);
      },
    });
    const [arenaA, arenaB] = await Promise.all([
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
      admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
    ]);
    const foreign = await admin.tournament.findFirstOrThrow({ where: { arenaId: arenaB.id }, select: { id: true } });
    const before = await Promise.all([
      admin.tournamentGroup.count({ where: { tournamentId: foreign.id } }),
      admin.match.count({ where: { tournamentId: foreign.id } }),
    ]);
    await assert.rejects(exports.distributeTournamentGroups(foreign.id, arenaA.id), /Torneio.*encontrado/i);
    await assert.rejects(exports.generateTournamentMatches(foreign.id, arenaA.id), /Torneio.*encontrado/i);
    await assert.rejects(exports.recalculateTournamentRankingPoints(foreign.id, arenaA.id), /Torneio.*encontrado/i);
    assert.equal(transactionCount, 0);
    assert.deepEqual(await Promise.all([
      admin.tournamentGroup.count({ where: { tournamentId: foreign.id } }),
      admin.match.count({ where: { tournamentId: foreign.id } }),
    ]), before);
    const own = await admin.tournament.create({ data: {
      arenaId: arenaA.id, name: "Torneio descartável de isolamento", groupCount: 1,
      pairs: { create: [
        { name: "Dupla 1", totalPoints: 2, drawOrder: 1 },
        { name: "Dupla 2", totalPoints: 1, drawOrder: 2 },
      ] },
    }, select: { id: true } });
    createdTournamentId = own.id;
    assert.equal(await exports.distributeTournamentGroups(own.id, arenaA.id), 1);
    assert.equal(await exports.generateTournamentMatches(own.id, arenaA.id), true);
    assert.equal(await exports.recalculateTournamentRankingPoints(own.id, arenaA.id), undefined);
    assert.equal(await admin.tournamentGroup.count({ where: { tournamentId: own.id } }), 1);
    const match = await admin.match.findFirstOrThrow({ where: { tournamentId: own.id, stage: "GROUP", homePairId: { not: null }, awayPairId: { not: null } }, select: { id: true } });
    assert.equal(await exports.updateMatchResult(match.id, arenaA.id, 2, 0), true);
    assert.equal((await admin.match.findUniqueOrThrow({ where: { id: match.id }, select: { homeScore: true, awayScore: true } })).homeScore, 2);
    assert.equal(transactionCount, 4);
  } finally {
    if (createdTournamentId) await admin.tournament.deleteMany({ where: { id: createdTournamentId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
