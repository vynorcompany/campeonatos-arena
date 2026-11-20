import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal\?/.test(url);

test("Knockout swaps are atomic, arena isolated and preserve results and schedules", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "fixture";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [], require = createRequire(import.meta.url), cache = new Map<string, any>();
  function load(file: string): any {
    const absolute = path.resolve(file); if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    const source = readFileSync(absolute, "utf8");
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, console, process, Error, Date,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@/lib/prisma") return { prisma: runtime };
        if (name === "@/lib/audit/request-context") return { noteAuditArena() {} };
        if (name === "@/lib/rls") return { setArenaRlsContext: (tx: any, id: string) => tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)` };
        if (name.startsWith("@/")) return load("src/" + name.slice(2) + ".ts");
        if (name.startsWith(".")) return load(path.resolve(path.dirname(absolute), name) + ".ts");
        return require(name);
      },
    }, { filename: absolute }); return exports;
  }
  try {
    const arena = await admin.arena.create({ data: { name: "Swap QA", slug: "swap-" + randomUUID(), createdById: "goal-test" } }); arenas.push(arena.id);
    const event = await admin.tournament.create({ data: { arenaId: arena.id, name: "Swap QA", status: "PUBLISHED" } });
    const category = await admin.tournamentCategory.create({ data: { tournamentId: event.id, name: "Swap QA", level: 1 } });
    const competition = await admin.categoryCompetition.create({ data: { categoryId: category.id, format: "SIMPLE", status: "PUBLISHED" } });
    const pairs = await Promise.all(["A", "B", "C", "D"].map(name => admin.categoryPair.create({ data: { competitionId: competition.id, name } })));
    const game = (stage: string, roundOrder: number, homePairId: string | null, awayPairId: string | null) => admin.categoryMatch.create({ data: { competitionId: competition.id, stage, roundOrder, label: stage, homePairId, awayPairId, courtName: "Quadra QA", scheduledTime: "18:00" } });
    const a = await game("SEMIFINAL", 1, pairs[0].id, pairs[1].id), b = await game("SEMIFINAL", 2, pairs[2].id, pairs[3].id), final = await game("FINAL", 3, null, null);
    const swap = load("src/lib/services/category-competition/knockout-reordering.ts").swapKnockoutParticipants;
    const actor = { id: "goal-test", name: "QA" };
    const input = { matchId: a.id, side: "away", targetMatchId: b.id, targetSide: "home", expectedPairId: pairs[1].id, expectedTargetPairId: pairs[2].id };
    await assert.rejects(() => swap("other-arena", input, actor), /indisponível/);
    const group = await game("GROUP", 0, pairs[0].id, pairs[1].id);
    await assert.rejects(() => swap(arena.id, input, actor), /fase de grupos/);
    await admin.categoryMatch.update({ where: { id: group.id }, data: { homeScore: 6, awayScore: 2, winnerPairId: pairs[0].id } });
    await admin.categoryMatch.update({ where: { id: final.id }, data: { manualStatus: "LIVE" } });
    await assert.rejects(() => swap(arena.id, input, actor), /fase seguinte/);
    await admin.categoryMatch.update({ where: { id: final.id }, data: { manualStatus: "WAITING" } });
    await admin.categoryMatch.update({ where: { id: a.id }, data: { homeScore: 0 } });
    await assert.rejects(() => swap(arena.id, input, actor), /resultado registrado/);
    await admin.categoryMatch.update({ where: { id: a.id }, data: { homeScore: null } });
    const booking = await admin.scheduleOccurrence.create({ data: { arenaId: arena.id, categoryMatchId: a.id, sourceType: "TOURNAMENT", title: "Swap QA", startsAt: new Date("2026-11-20T18:00:00Z"), endsAt: new Date("2026-11-20T19:00:00Z") } });
    await assert.rejects(() => swap(arena.id, input, actor), /reserva vinculada/);
    await admin.scheduleOccurrence.update({ where: { id: booking.id }, data: { status: "CANCELED" } });
    const attempts = await Promise.allSettled([swap(arena.id, input, actor), swap(arena.id, input, actor)]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    const updatedA = await admin.categoryMatch.findUniqueOrThrow({ where: { id: a.id } }), updatedB = await admin.categoryMatch.findUniqueOrThrow({ where: { id: b.id } });
    assert.equal(updatedA.awayPairId, pairs[2].id); assert.equal(updatedB.homePairId, pairs[1].id);
    assert.equal(updatedA.scheduledTime, "18:00"); assert.equal(updatedA.courtName, "Quadra QA");
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: group.id } })).homeScore, 6);
    assert.equal(await admin.auditEvent.count({ where: { arenaId: arena.id, action: "KNOCKOUT_PARTICIPANTS_SWAPPED" } }), 1);
    await swap(arena.id, { ...input, targetMatchId: a.id, side: "home", targetSide: "away", expectedPairId: pairs[0].id, expectedTargetPairId: pairs[2].id }, actor);
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: a.id } })).homePairId, pairs[2].id);
    await assert.rejects(() => swap(arena.id, { ...input, targetMatchId: final.id }, actor), /mesma fase/);
    await admin.categoryCompetition.update({ where: { id: competition.id }, data: { format: "TRIO" } });
    await swap(arena.id, { ...input, targetMatchId: a.id, side: "home", targetSide: "away", expectedPairId: pairs[2].id, expectedTargetPairId: pairs[0].id }, actor);
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: a.id } })).homePairId, pairs[0].id);
    await admin.categoryCompetition.update({ where: { id: competition.id }, data: { format: "SIMPLE" } });
    const record = load("src/lib/services/category-competition/matches.ts").recordCategoryMatchResult;
    await record(arena.id, a.id, 6, 2); await record(arena.id, b.id, 6, 3);
    const advanced = await admin.categoryMatch.findUniqueOrThrow({ where: { id: final.id } });
    assert.equal(advanced.homePairId, pairs[0].id); assert.equal(advanced.awayPairId, pairs[1].id);
    await admin.categoryCompetition.update({ where: { id: competition.id }, data: { status: "FINISHED" } });
    await assert.rejects(() => swap(arena.id, input, actor), /indisponível/);
  } finally {
    await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.tournament.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.auditEvent.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
