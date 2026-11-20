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

test("TV includes live category games only for the selected arena/event and scheduling preserves saved status", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "fixture";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [], require = createRequire(import.meta.url), cache = new Map<string, any>();
  function load(file: string): any {
    const absolute = path.resolve(file); if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    let source = readFileSync(absolute, "utf8");
    if (file.endsWith("tv-presentation.ts")) source += "\nexport { getTournamentUpcomingMatchesPayload };";
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, console, process, Error, Date,
      require(name: string) {
        if (name === "server-only") return {};
        if (name === "@/lib/prisma") return { prisma: runtime };
        if (name === "@/lib/audit/request-context") return { noteAuditArena() {} };
        if (name === "@/lib/rls") return { setArenaRlsContext: (tx: any, id: string) => tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)` };
        if (name.startsWith("@/")) return load("src/" + name.slice(2) + ".ts");
        return require(name);
      },
    }, { filename: absolute }); return exports;
  }
  try {
    for (let i = 0; i < 2; i++) arenas.push((await admin.arena.create({ data: { name: "TV event QA", slug: "tv-event-" + randomUUID(), createdById: "goal-test" } })).id);
    const make = async (arenaId: string, options: { status?: string; active?: boolean } = {}) => {
      const event = await admin.tournament.create({ data: { arenaId, name: "TV event QA", status: options.status ?? "PUBLISHED" } });
      const category = await admin.tournamentCategory.create({ data: { tournamentId: event.id, name: "TV QA", level: 1, active: options.active ?? true } });
      const competition = await admin.categoryCompetition.create({ data: { categoryId: category.id, format: "SIMPLE", status: "PUBLISHED" } });
      const pairs = await Promise.all(["A", "B"].map(name => admin.categoryPair.create({ data: { competitionId: competition.id, name } })));
      const game = (extra = {}) => admin.categoryMatch.create({ data: { competitionId: competition.id, label: "Final TV QA", stage: "FINAL", roundOrder: 1, homePairId: pairs[0].id, awayPairId: pairs[1].id, ...extra } });
      return { event, competition, pairs, game };
    };
    const own = await make(arenas[0]), other = await make(arenas[1]), another = await make(arenas[0]);
    const live = await own.game({ manualStatus: "LIVE" }), scheduled = await own.game({ manualStatus: "SCHEDULED" });
    await own.game({ manualStatus: "FINISHED", winnerPairId: own.pairs[0].id, homeScore: 6, awayScore: 2 });
    await own.game({ manualStatus: "LIVE", showOnTv: false }); await own.game({ manualStatus: "LIVE", awayPairId: null });
    await other.game({ manualStatus: "LIVE" }); await another.game({ manualStatus: "LIVE" });
    const legacyPairs = await Promise.all(["Legacy A", "Legacy B"].map(name => admin.pair.create({ data: { tournamentId: own.event.id, name, totalPoints: 0, drawOrder: 1 } })));
    const legacy = await admin.match.create({ data: { tournamentId: own.event.id, label: "Legacy", stage: "FINAL", roundOrder: 1, homePairId: legacyPairs[0].id, awayPairId: legacyPairs[1].id, manualStatus: "LIVE" } });
    const tv = load("src/lib/services/tv-presentation.ts").getTournamentUpcomingMatchesPayload;
    let rows = await tv(arenas[0], own.event.id);
    assert.deepEqual(rows.map((r: any) => r.id).sort(), [`match-category-${live.id}`, `match-category-${scheduled.id}`, `match-${legacy.id}`].sort());
    assert.equal(rows[0].status, "LIVE"); assert.equal(rows.at(-1).status, "SCHEDULED");
    assert.equal((await tv(arenas[0], other.event.id)).length, 0);
    assert.equal((await tv(arenas[0], "")).length, 0);
    const matches = load("src/lib/services/category-competition/matches.ts");
    const waiting = await own.game();
    await matches.updateCategoryMatchSchedule(arenas[0], waiting.id, "2026-11-20", "17:00");
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: waiting.id } })).manualStatus, "SCHEDULED");
    await matches.updateCategoryMatchSchedule(arenas[0], waiting.id, null, null);
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: waiting.id } })).manualStatus, "WAITING");
    await matches.updateCategoryMatchStatus(arenas[0], scheduled.id, "LIVE");
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: scheduled.id } })).manualStatus, "LIVE");
    await matches.updateCategoryMatchSchedule(arenas[0], scheduled.id, "2026-11-20", "18:30", "Quadra QA");
    await matches.updateCategoryMatchSchedule(arenas[0], scheduled.id, null, null);
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: scheduled.id } })).manualStatus, "LIVE");
    rows = await tv(arenas[0], own.event.id);
    assert.equal(rows.find((r: any) => r.id === `match-category-${scheduled.id}`).status, "LIVE");
    await admin.categoryMatch.update({ where: { id: scheduled.id }, data: { manualStatus: "FINISHED", winnerPairId: own.pairs[0].id, homeScore: 6, awayScore: 4 } });
    await matches.updateCategoryMatchSchedule(arenas[0], scheduled.id, "2026-11-20", "19:00");
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: scheduled.id } })).manualStatus, "FINISHED");
    assert.equal((await tv(arenas[0], own.event.id)).some((r: any) => r.id === `match-category-${scheduled.id}`), false);
    await admin.categoryCompetition.update({ where: { id: own.competition.id }, data: { status: "DRAFT" } });
    assert.deepEqual((await tv(arenas[0], own.event.id)).map((r: any) => r.id), [`match-${legacy.id}`]);
    await admin.tournament.update({ where: { id: own.event.id }, data: { status: "FINISHED" } });
    assert.equal((await tv(arenas[0], own.event.id)).length, 0);
  } finally {
    await admin.tournament.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
