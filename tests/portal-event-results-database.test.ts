import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, type CompetitionFormat } from "@prisma/client";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("Portal saves visitor tournament scores and Trio formations, preserves League host permissions and prevents overwrites under RLS", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "fixture";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [], require = createRequire(import.meta.url), cache = new Map<string, any>();
  function load(file: string): any {
    const absolute = path.resolve(file); if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, console, process, Error,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@/lib/prisma") return { prisma: runtime };
        if (name === "@/lib/rls") return { setArenaRlsContext: (tx: any, id: string) => tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)` };
        if (name.startsWith("@/")) return load("src/" + name.slice(2) + ".ts");
        return require(name);
      },
    }, { filename: absolute }); return exports;
  }
  try {
    for (let i = 0; i < 2; i++) arenas.push((await admin.arena.create({ data: { name: "Portal Result QA", slug: "portal-result-" + randomUUID(), createdById: "goal-test" } })).id);
    const players = await Promise.all(Array.from({ length: 7 }, (_, i) => admin.player.create({ data: { arenaId: arenas[0], name: `Resultado QA ${i}` } })));
    const actor = (i: number) => ({ playerId: players[i].id, playerIds: [players[i].id] });
    const make = async (format: CompetitionFormat, status = "PUBLISHED") => {
      const tournament = await admin.tournament.create({ data: { arenaId: arenas[0], name: "Portal Result QA" } });
      const category = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Resultados QA", level: 1 } });
      const competition = await admin.categoryCompetition.create({ data: { categoryId: category.id, format, status, isPublic: true } });
      const pairs = await Promise.all([0, 1].map(side => admin.categoryPair.create({ data: { competitionId: competition.id, name: `Equipe ${side}`, players: { create: players.slice(side * 3, side * 3 + (format === "TRIO" ? 3 : 2)).map((player, i) => ({ playerId: player.id, slot: i + 1 })) } } })));
      return admin.categoryMatch.create({ data: { competitionId: competition.id, label: "Final QA", stage: "FINAL", roundOrder: 1, homePairId: pairs[0].id, awayPairId: pairs[1].id } });
    };
    const simple = await make("SIMPLE"), draft = await make("SIMPLE", "DRAFT");
    const service = load("src/lib/services/category-competition/matches.ts");
    await assert.rejects(service.recordCategoryMatchResult(arenas[0], simple.id, 6, 2, actor(6)), /Somente atletas/);
    await assert.rejects(service.recordCategoryMatchResult(arenas[1], simple.id, 6, 2, actor(0)), /não disponível/);
    await assert.rejects(service.recordCategoryMatchResult(arenas[0], draft.id, 6, 2, actor(0)), /não disponível/);
    await admin.categoryCompetition.update({ where: { id: simple.competitionId }, data: { isPublic: false } });
    await assert.rejects(service.recordCategoryMatchResult(arenas[0], simple.id, 6, 2, actor(3)), /não disponível/);
    await admin.categoryCompetition.update({ where: { id: simple.competitionId }, data: { isPublic: true } });
    const concurrent = await Promise.allSettled([1, 2].map(() => service.recordCategoryMatchResult(arenas[0], simple.id, 6, 2, actor(3))));
    assert.equal(concurrent.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(concurrent.filter(result => result.status === "rejected").length, 1);
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: simple.id } })).homeScore, 6);
    await assert.rejects(service.recordCategoryMatchResult(arenas[0], simple.id, 1, 6, actor(0)), /já foi registrado/);
    assert.equal(await admin.auditEvent.count({ where: { arenaId: arenas[0], entityId: simple.id, action: "PORTAL_MATCH_RESULT" } }), 1);
    const league = await make("LEAGUE");
    const sets = { matchId: league.id, homeSet1: 6, awaySet1: 4, homeSet2: 6, awaySet2: 3, homeSet3: null, awaySet3: null };
    await assert.rejects(service.recordCategoryLeagueMatchResult(arenas[0], sets, undefined, actor(3)), /Somente a dupla mandante/);
    await assert.rejects(service.recordCategoryMatchResult(arenas[0], league.id, 6, 2, actor(0)), /Informe os sets/);
    const saved = await service.recordCategoryLeagueMatchResult(arenas[0], sets, undefined, actor(0));
    assert.equal(saved.homeScore, 2); assert.equal(saved.awayScore, 0);
    await assert.rejects(service.recordCategoryLeagueMatchResult(arenas[0], sets, undefined, actor(0)), /já foi registrado/);
    const trio = await make("TRIO"), trioService = load("src/lib/services/category-trio.ts");
    const game = (gameNumber: number, h: number[], a: number[], homeScore = 6, awayScore = 2) => ({ gameNumber, homePlayerIds: h.map(i => players[i].id), awayPlayerIds: a.map(i => players[i].id), homeScore, awayScore });
    const write = (input: any) => trioService.recordCategoryTrioGame(arenas[0], trio.id, input, { id: players[3].id, name: "Portal QA" }, actor(3));
    assert.equal((await write(game(1, [0, 1], [3, 4]))).finished, false);
    await assert.rejects(write(game(1, [0, 1], [3, 4])), /Este jogo já foi registrado/);
    await assert.rejects(write(game(2, [0, 1], [3, 5])), /já usou essa formação/);
    await assert.rejects(write(game(2, [0, 6], [3, 5])), /Selecione dois/);
    assert.equal((await write(game(2, [0, 2], [3, 5], 2, 6))).needsDecider, true);
    assert.equal((await write(game(3, [1, 2], [4, 5]))).finished, true);
    assert.equal(await admin.categoryTrioGame.count({ where: { matchId: trio.id } }), 3);
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: trio.id } })).homeScore, 2);
    assert.equal(await admin.categoryMatch.count({ where: { id: { in: [simple.id, draft.id, league.id, trio.id] } } }), 4);
  } finally {
    await admin.tournament.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
