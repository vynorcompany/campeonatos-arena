import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { buildRoundRobin } from "../src/lib/tournament-category/draw";
import { buildMonthlyLeagueSchedule } from "../src/lib/league/monthly-schedule";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal\?/.test(url);

test("Group drag editing preserves the published draw and refuses played, stale or foreign changes", { skip: !enabled, timeout: 120000 }, async () => {
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
    const arena = await admin.arena.create({ data: { name: "Groups QA", slug: "group-edit-" + randomUUID(), createdById: "goal-test" } }); arenas.push(arena.id);
    const event = await admin.tournament.create({ data: { arenaId: arena.id, name: "Groups QA", status: "PUBLISHED" } });
    const category = await admin.tournamentCategory.create({ data: { tournamentId: event.id, name: "Groups QA", level: 1 } });
    const competition = await admin.categoryCompetition.create({ data: { categoryId: category.id, format: "SIMPLE" } });
    await Promise.all(Array.from({ length: 8 }, (_, index) => admin.categoryPair.create({ data: { competitionId: competition.id, name: "Equipe " + index, drawOrder: index + 1 } })));
    const allPairs = await admin.categoryPair.findMany({ where: { competitionId: competition.id }, orderBy: { drawOrder: "asc" } });
    for (let index = 0; index < 2; index++) {
      const group = await admin.categoryGroup.create({ data: { competitionId: competition.id, name: "Grupo " + index, drawOrder: index + 1 } });
      await admin.categoryPair.updateMany({ where: { id: { in: allPairs.slice(index * 4, index * 4 + 4).map(pair => pair.id) } }, data: { groupId: group.id } });
    }
    const save = load("src/lib/services/category-competition/group-editing.ts").saveCategoryGroups;
    const actor = { id: "goal-test", name: "QA" };
    const layout = async () => (await admin.categoryGroup.findMany({ where: { competitionId: competition.id }, orderBy: { drawOrder: "asc" }, include: { pairs: { orderBy: { drawOrder: "asc" } } } })).map(group => ({ id: group.id, pairIds: group.pairs.map(pair => pair.id) }));
    const exchange = (groups: any[]) => { const next = structuredClone(groups); [next[0].pairIds[0], next[1].pairIds[0]] = [next[1].pairIds[0], next[0].pairIds[0]]; return next; };
    let before = await layout(), after = exchange(before);
    await assert.rejects(() => save("foreign-arena", { competitionId: competition.id, expectedGroups: before, groups: after }, actor), /indisponível/);
    await save(arena.id, { competitionId: competition.id, expectedGroups: before, groups: after }, actor);
    assert.deepEqual(await layout(), after);
    let round = 0;
    for (const group of await layout()) {
      await admin.categoryMatch.createMany({ data: buildRoundRobin(group.pairIds).map(match => ({ ...match, competitionId: competition.id, groupId: group.id, stage: "GROUP", label: "Grupo QA", roundOrder: ++round })) });
    }
    await admin.categoryMatch.create({ data: { competitionId: competition.id, stage: "FINAL", label: "Final QA", roundOrder: ++round } });
    await admin.categoryCompetition.update({ where: { id: competition.id }, data: { status: "PUBLISHED" } });
    const games = await admin.categoryMatch.findMany({ where: { competitionId: competition.id }, orderBy: { roundOrder: "asc" } });
    const first = games.find(match => match.stage === "GROUP")!;
    await admin.categoryMatch.update({ where: { id: first.id }, data: { scheduledDate: "2026-11-21", scheduledTime: "18:30", courtName: "Quadra QA", manualStatus: "SCHEDULED", showOnTv: false } });
    before = await layout(); after = exchange(before);
    const input = { competitionId: competition.id, expectedGroups: before, groups: after };
    const invalid = structuredClone(after); invalid[0].pairIds[0] = invalid[1].pairIds[0];
    await assert.rejects(() => save(arena.id, { ...input, groups: invalid }, actor), /Distribuição inválida/);
    const resized = structuredClone(after); resized[1].pairIds.push(resized[0].pairIds.pop()!);
    await assert.rejects(() => save(arena.id, { ...input, groups: resized }, actor), /tamanho/);
    await admin.categoryMatch.update({ where: { id: first.id }, data: { homeScore: 0 } });
    await assert.rejects(() => save(arena.id, input, actor), /já foi iniciado/);
    await admin.categoryMatch.update({ where: { id: first.id }, data: { homeScore: null, manualStatus: "LIVE" } });
    await assert.rejects(() => save(arena.id, input, actor), /já foi iniciado/);
    await admin.categoryMatch.update({ where: { id: first.id }, data: { manualStatus: "SCHEDULED" } });
    const final = games.find(match => match.stage === "FINAL")!;
    await admin.categoryMatch.update({ where: { id: final.id }, data: { manualStatus: "LIVE" } });
    await assert.rejects(() => save(arena.id, input, actor), /já foi iniciado/);
    await admin.categoryMatch.update({ where: { id: final.id }, data: { manualStatus: "WAITING" } });
    const affected = games.find(match => match.stage === "GROUP" && (match.homePairId === before[0].pairIds[0] || match.awayPairId === before[0].pairIds[0]))!;
    const booking = await admin.scheduleOccurrence.create({ data: { arenaId: arena.id, categoryMatchId: affected.id, sourceType: "TOURNAMENT", title: "Group QA", startsAt: new Date("2026-11-21T18:30:00Z"), endsAt: new Date("2026-11-21T19:30:00Z") } });
    await assert.rejects(() => save(arena.id, input, actor), /reserva, proposta ou desafio/);
    assert.deepEqual(await layout(), before);
    await admin.scheduleOccurrence.update({ where: { id: booking.id }, data: { status: "CANCELED" } });
    const attempts = await Promise.allSettled([save(arena.id, input, actor), save(arena.id, input, actor)]);
    assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
    assert.deepEqual(await layout(), after);
    const updated = await admin.categoryMatch.findMany({ where: { competitionId: competition.id }, orderBy: { roundOrder: "asc" } });
    assert.deepEqual(updated.map(match => match.id), games.map(match => match.id));
    const scheduled = updated.find(match => match.id === first.id)!;
    assert.equal(scheduled.scheduledTime, "18:30"); assert.equal(scheduled.scheduledDate, "2026-11-21"); assert.equal(scheduled.courtName, "Quadra QA"); assert.equal(scheduled.manualStatus, "SCHEDULED"); assert.equal(scheduled.showOnTv, false);
    for (const group of after) {
      const matches = updated.filter(match => match.groupId === group.id);
      assert.equal(matches.length, 6);
      assert.equal(new Set(matches.map(match => [match.homePairId, match.awayPairId].sort().join(":"))).size, 6);
      assert.ok(matches.every(match => group.pairIds.includes(match.homePairId!) && group.pairIds.includes(match.awayPairId!)));
    }
    before = await layout(); after = [...before].reverse().map(group => ({ ...group, pairIds: [...group.pairIds].reverse() }));
    await save(arena.id, { competitionId: competition.id, expectedGroups: before, groups: after }, actor);
    assert.deepEqual(await layout(), after);
    assert.equal(await admin.auditEvent.count({ where: { arenaId: arena.id, action: "CATEGORY_GROUPS_REORDERED" } }), 3);
    await admin.categoryMatch.update({ where: { id: first.id }, data: { homeScore: 6, awayScore: 2, winnerPairId: (await admin.categoryMatch.findUniqueOrThrow({ where: { id: first.id } })).homePairId, manualStatus: "FINISHED" } });
    await assert.rejects(() => save(arena.id, { competitionId: competition.id, expectedGroups: after, groups: before }, actor), /já foi iniciado/);
    assert.deepEqual(await layout(), after);
    const leagueCategory = await admin.tournamentCategory.create({ data: { tournamentId: event.id, name: "Liga QA", level: 2 } });
    const league = await admin.categoryCompetition.create({ data: { categoryId: leagueCategory.id, format: "LEAGUE" } });
    for (let index = 0; index < 4; index++) await admin.categoryPair.create({ data: { competitionId: league.id, name: "Liga " + index, drawOrder: index + 1 } });
    const leaguePairs = await admin.categoryPair.findMany({ where: { competitionId: league.id }, orderBy: { drawOrder: "asc" } });
    const createdLeagueGroup = await admin.categoryGroup.create({ data: { competitionId: league.id, name: "Liga QA", drawOrder: 1 } });
    await admin.categoryPair.updateMany({ where: { competitionId: league.id }, data: { groupId: createdLeagueGroup.id } });
    const cycle = await admin.leagueCycle.create({ data: { competitionId: league.id, referenceMonth: "2026-11" } });
    await admin.categoryMatch.createMany({ data: buildMonthlyLeagueSchedule(leaguePairs.map(pair => pair.id)).matches.map((match, index) => ({ competitionId: league.id, groupId: createdLeagueGroup.id, stage: "GROUP", label: "Liga QA", roundOrder: index + 1, homePairId: match.homePairId, awayPairId: match.awayPairId, leagueBlock: match.blockNumber, leagueCycleId: cycle.id, hostProposalDeadline: new Date("2026-11-30T23:59:59Z") })) });
    await admin.categoryCompetition.update({ where: { id: league.id }, data: { status: "PUBLISHED" } });
    const leagueGroup = await admin.categoryGroup.findFirstOrThrow({ where: { competitionId: league.id }, include: { pairs: { orderBy: { drawOrder: "asc" } } } });
    const leagueLayout = [{ id: leagueGroup.id, pairIds: leagueGroup.pairs.map(pair => pair.id) }];
    const leagueGames = await admin.categoryMatch.findMany({ where: { competitionId: league.id }, orderBy: { roundOrder: "asc" } });
    await save(arena.id, { competitionId: league.id, expectedGroups: leagueLayout, groups: [{ id: leagueGroup.id, pairIds: [...leagueLayout[0].pairIds].reverse() }] }, actor);
    const editedLeagueGames = await admin.categoryMatch.findMany({ where: { competitionId: league.id }, orderBy: { roundOrder: "asc" } });
    const metadata = (matches: typeof leagueGames) => matches.map(({ homePairId, awayPairId, updatedAt, ...rest }) => rest);
    assert.deepEqual(metadata(editedLeagueGames), metadata(leagueGames));
  } finally {
    await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.tournament.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.auditEvent.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
