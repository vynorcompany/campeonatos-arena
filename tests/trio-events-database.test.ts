import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { ensureRegistrationTrio } from "../src/lib/tournaments/trio-registration";
import { PrismaClient } from "@prisma/client";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("Trio group and knockout encounters enforce formations, aggregate results, tenant isolation and history", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [], require = createRequire(import.meta.url), cache = new Map<string, any>();
  const scope = (arenaId: string, callback: any) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return callback(tx); }, { isolationLevel: "Serializable" });
  function load(file: string): any {
    const absolute = path.resolve(file); if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, console, process,
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
    for (let i = 0; i < 2; i++) arenas.push((await admin.arena.create({ data: { name: "Trio QA", slug: "trio-qa-" + randomUUID(), createdById: "goal-test" } })).id);
    const tournament = await admin.tournament.create({ data: { arenaId: arenas[0], name: "Trio QA" } });
    const category = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Trio QA", level: 1 } });
    const registrationCategory = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Inscrições Trio QA", level: 2 } });
    const registrationCompetition = await admin.categoryCompetition.create({ data: { categoryId: registrationCategory.id, format: "TRIO" } });
    const registration = await admin.publicTournamentRegistration.create({ data: { tournamentId: tournament.id, categoryId: registrationCategory.id, competitionId: registrationCompetition.id, registrationOrder: 1, leadName: "Primeiro Atleta", leadPhone: "42999990001", leadCpf: "11111111111", partnerName: "Segundo Atleta", partnerPhone: "42999990002", partnerCpf: "22222222222", thirdName: "Terceiro Atleta", thirdPhone: "42999990003", thirdCpf: "33333333333", amountCents: 30000, paymentStatus: "PAID", status: "CONFIRMED" } });
    await admin.publicTournamentRegistration.update({ where: { id: registration.id }, data: { status: "PENDING_PAYMENT", paymentStatus: "PENDING" } });
    await assert.rejects(scope(arenas[0], (tx: any) => ensureRegistrationTrio(tx, arenas[0], registration.id)), /Confirme o pagamento/);
    assert.equal(await admin.categoryPair.count({ where: { competitionId: registrationCompetition.id } }), 0);
    await admin.publicTournamentRegistration.update({ where: { id: registration.id }, data: { status: "CONFIRMED", paymentStatus: "PAID" } });
    await scope(arenas[0], (tx: any) => ensureRegistrationTrio(tx, arenas[0], registration.id));
    await scope(arenas[0], (tx: any) => ensureRegistrationTrio(tx, arenas[0], registration.id));
    const registeredTeams = await admin.categoryPair.findMany({ where: { competitionId: registrationCompetition.id }, include: { players: true } });
    assert.equal(registeredTeams.length, 1); assert.equal(registeredTeams[0].players.length, 3);
    assert.equal(await admin.pair.count({ where: { tournamentId: tournament.id } }), 0);
    const competition = await admin.categoryCompetition.create({ data: { categoryId: category.id, format: "TRIO" } });
    for (let i = 0; i < 8; i++) {
      const players = await Promise.all([0, 1, 2].map(n => admin.player.create({ data: { arenaId: arenas[0], name: `Trio ${i} atleta ${n}` } })));
      await admin.categoryPair.create({ data: { competitionId: competition.id, name: "Equipe " + i, drawOrder: i + 1, players: { create: players.map((player, n) => ({ playerId: player.id, slot: n + 1 })) } } });
    }
    const legacyCategory = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Duplas preservadas QA", level: 3 } });
    const legacyRegistration = await admin.publicTournamentRegistration.create({ data: { tournamentId: tournament.id, categoryId: legacyCategory.id, registrationOrder: 2, leadName: "Dupla Antiga Um", leadPhone: "42999990004", leadCpf: "44444444444", partnerName: "Dupla Antiga Dois", partnerPhone: "42999990005", partnerCpf: "55555555555", amountCents: 20000, status: "CONFIRMED", paymentStatus: "PAID" } });
    await assert.rejects(load("src/lib/services/category-competition/lifecycle.ts").createCategoryCompetition(arenas[0], { categoryId: legacyCategory.id, class: "", gender: "", format: "TRIO", rankingId: null, isPublic: true }), /já possui inscrições de duplas/);
    assert.equal(await admin.categoryCompetition.count({ where: { categoryId: legacyCategory.id } }), 0);
    assert.equal((await admin.publicTournamentRegistration.findUniqueOrThrow({ where: { id: legacyRegistration.id } })).amountCents, 20000);
    const publicEvent = await admin.tournament.create({ data: { arenaId: arenas[0], name: "Evento público Trio QA", creationMode: "PUBLIC" } });
    const publicCategory = await admin.tournamentCategory.create({ data: { tournamentId: publicEvent.id, name: "Trio público", level: 1, priceFirstCents: 2500 } });
    const lifecycle = load("src/lib/services/category-competition/lifecycle.ts");
    const publicTrio = await lifecycle.createCategoryCompetition(arenas[0], { categoryId: publicCategory.id, class: "5ª", gender: "MASCULINO", format: "TRIO", rankingId: null, isPublic: true });
    assert.equal(publicTrio.format, "TRIO"); assert.equal(publicTrio.status, "DRAFT"); assert.equal(publicTrio.isPublic, true);
    assert.equal((await admin.tournamentCategory.findUniqueOrThrow({where:{id:publicCategory.id}})).priceFirstCents, 2500);
    const bracketCategory = await admin.tournamentCategory.create({ data: { tournamentId: publicEvent.id, name: "Chave preservada", level: 2 } });
    const existingBracket = await admin.categoryBracket.create({ data: { tournamentId: publicEvent.id, categoryId: bracketCategory.id, matches: { create: { label: "Final existente", roundOrder: 1, stage: "FINAL", status: "FINISHED", courtName: "Quadra QA" } } }, include: { matches: true } });
    await assert.rejects(lifecycle.createCategoryCompetition(arenas[0], { categoryId: bracketCategory.id, class: "5ª", gender: "MASCULINO", format: "TRIO", rankingId: null, isPublic: true }), /já possui chaveamento/);
    assert.equal(await admin.categoryCompetition.count({where:{categoryId:bracketCategory.id}}),0);
    assert.deepEqual(await admin.categoryBracket.findUniqueOrThrow({where:{id:existingBracket.id},include:{matches:true}}),existingBracket);
    const draw = load("src/lib/services/category-competition/draw.ts"), service = load("src/lib/services/category-trio.ts"), matches = load("src/lib/services/category-competition/matches.ts");
    await draw.generateCategoryDraw(arenas[0], competition.id); await draw.publishCategoryDraw(arenas[0], competition.id);
    const group = await admin.categoryMatch.findMany({ where: { competitionId: competition.id, stage: "GROUP" }, orderBy: { roundOrder: "asc" }, include: { homePair: { include: { players: { orderBy: { slot: "asc" } } } }, awayPair: { include: { players: { orderBy: { slot: "asc" } } } } } });
    const game = (m: any, n: number, homeWins: boolean) => ({ gameNumber: n, homePlayerIds: n === 1 ? m.homePair.players.slice(0, 2).map((p: any) => p.playerId) : n === 2 ? [m.homePair.players[0].playerId, m.homePair.players[2].playerId] : m.homePair.players.slice(1).map((p: any) => p.playerId), awayPlayerIds: n === 1 ? m.awayPair.players.slice(0, 2).map((p: any) => p.playerId) : n === 2 ? [m.awayPair.players[0].playerId, m.awayPair.players[2].playerId] : m.awayPair.players.slice(1).map((p: any) => p.playerId), homeScore: homeWins ? 6 : 2, awayScore: homeWins ? 2 : 6 });
    const first = group[0];
    await assert.rejects(service.recordCategoryTrioGame(arenas[1], first.id, game(first, 1, true)), /nesta arena/);
    await assert.rejects(service.recordCategoryTrioGame(arenas[0], first.id, game(first, 3, true)), /ordem/);
    await service.recordCategoryTrioGame(arenas[0], first.id, game(first, 1, true));
    assert.equal((await admin.categoryMatch.findUniqueOrThrow({ where: { id: first.id } })).winnerPairId, null);
    const repeated = { ...game(first, 2, false), homePlayerIds: [...game(first, 1, true).homePlayerIds].reverse() };
    await assert.rejects(service.recordCategoryTrioGame(arenas[0], first.id, repeated), /formação/);
    await assert.rejects(scope(arenas[0], (tx: any) => tx.categoryTrioGame.create({ data: { ...repeated, matchId: first.id, competitionId: competition.id } })), /formation already used/);
    await assert.rejects(matches.recordCategoryMatchResult(arenas[0], first.id, 2, 0), /cada jogo do Trio/);
    await assert.rejects(matches.updateCategoryMatchStatus(arenas[0], first.id, "FINISHED"), /status do Trio/);
    for (const [index, match] of group.entries()) {
      if (index !== 0) await service.recordCategoryTrioGame(arenas[0], match.id, game(match, 1, true));
      await service.recordCategoryTrioGame(arenas[0], match.id, game(match, 2, index === 1));
      if (index === 1) await assert.rejects(service.recordCategoryTrioGame(arenas[0], match.id, game(match, 3, true)), /1 a 1/);
      else await service.recordCategoryTrioGame(arenas[0], match.id, game(match, 3, true));
    }
    const completed = await admin.categoryMatch.findUniqueOrThrow({ where: { id: first.id } });
    assert.equal(completed.homeScore, 2); assert.equal(completed.awayScore, 1); assert.equal(completed.winnerPairId, first.homePairId);
    assert.equal(await scope(arenas[1], (tx: any) => tx.categoryTrioGame.count({ where: { competitionId: competition.id } })), 0);
    const quarter = await admin.categoryMatch.findFirstOrThrow({ where: { competitionId: competition.id, stage: "QUARTERFINAL" }, orderBy: { roundOrder: "asc" }, include: { homePair: { include: { players: { orderBy: { slot: "asc" } } } }, awayPair: { include: { players: { orderBy: { slot: "asc" } } } }, trioGames: true } });
    assert.ok(quarter.homePairId && quarter.awayPairId); assert.equal(quarter.trioGames.length, 0);
    await service.recordCategoryTrioGame(arenas[0], quarter.id, game(quarter, 1, true));
    await assert.rejects(service.recordCategoryTrioGame(arenas[0], first.id, game(first, 1, false)), /mata-mata já começou/);
    await service.recordCategoryTrioGame(arenas[0], quarter.id, game(quarter, 2, false));
    await service.recordCategoryTrioGame(arenas[0], quarter.id, game(quarter, 3, true));
    const semifinal = await admin.categoryMatch.findFirstOrThrow({ where: { competitionId: competition.id, stage: "SEMIFINAL" }, orderBy: { roundOrder: "asc" }, include: { trioGames: true } });
    assert.equal(semifinal.homePairId, quarter.homePairId); assert.equal(semifinal.trioGames.length, 0);
    await assert.rejects(scope(arenas[0], (tx: any) => tx.categoryPairPlayer.delete({ where: { id: first.homePair!.players[0].id } })), /lineup cannot lose/);
    await assert.rejects(scope(arenas[0], (tx: any) => tx.categoryMatch.update({ where: { id: first.id }, data: { homeScore: 9 } })), /result must match/);
    for (const stage of ["QUARTERFINAL", "SEMIFINAL", "FINAL"] as const) {
      const remaining = await admin.categoryMatch.findMany({ where: { competitionId: competition.id, stage, winnerPairId: null }, orderBy: { roundOrder: "asc" }, include: { homePair: { include: { players: { orderBy: { slot: "asc" } } } }, awayPair: { include: { players: { orderBy: { slot: "asc" } } } } } });
      for (const match of remaining) {
        assert.ok(match.homePairId && match.awayPairId);
        await service.recordCategoryTrioGame(arenas[0], match.id, game(match, 1, true));
        await service.recordCategoryTrioGame(arenas[0], match.id, game(match, 2, true));
      }
    }
    const final = await admin.categoryMatch.findFirstOrThrow({ where: { competitionId: competition.id, stage: "FINAL" } });
    assert.ok(final.winnerPairId); assert.equal(final.homeScore, 2); assert.equal(final.awayScore, 0);
    await load("src/lib/services/category-competition/lifecycle.ts").finishCategoryCompetition(arenas[0], competition.id);
    assert.equal((await admin.categoryCompetition.findUniqueOrThrow({ where: { id: competition.id } })).status, "FINISHED");
    assert.ok(await admin.auditEvent.count({ where: { arenaId: arenas[0], action: "TRIO_GAME_RESULT" } }));
  } finally {
    for (const arenaId of arenas) { await admin.tournament.deleteMany({ where: { arenaId } }); await admin.player.deleteMany({ where: { arenaId } }); await admin.arena.deleteMany({ where: { id: arenaId } }); }
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
