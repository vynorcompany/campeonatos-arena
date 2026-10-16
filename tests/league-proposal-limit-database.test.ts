import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { createLimitedLeagueProposal } from "../src/lib/league/proposal-limit";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("duas sugestões simultâneas não ultrapassam o limite de três nem cruzam arenas", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  let matchId = "";
  const pairIds: string[] = [];
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const tournament = await admin.tournament.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Liga GOAL" }, select: { id: true } });
    const category = await admin.tournamentCategory.findFirstOrThrow({ where: { tournamentId: tournament.id }, select: { id: true } });
    const competition = await admin.categoryCompetition.findUniqueOrThrow({ where: { categoryId: category.id }, select: { id: true } });
    const pairSuffix = randomUUID();
    const pairs = await Promise.all(["Mandante", "Visitante"].map((label) => admin.categoryPair.create({
      data: { competitionId: competition.id, name: `${label} Proposta GOAL ${pairSuffix}` }, select: { id: true },
    })));
    pairIds.push(...pairs.map((pair) => pair.id));
    const court = await admin.court.findUniqueOrThrow({ where: { id: "goal-court-a" }, select: { id: true } });
    const match = await admin.categoryMatch.create({ data: {
      competitionId: competition.id, label: `Sugestões GOAL ${randomUUID()}`, stage: "LEAGUE", roundOrder: 99,
      homePairId: pairs[0].id, awayPairId: pairs[1].id,
    }, select: { id: true } });
    matchId = match.id;
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    const responseDueAt = new Date(startsAt.getTime() - 24 * 60 * 60_000);
    const input = { arenaId: arenaA.id, categoryMatchId: match.id, courtId: court.id, proposerPairId: pairs[0].id, opponentPairId: pairs[1].id, startsAt, endsAt, responseDueAt };
    await admin.leagueMatchProposal.createMany({ data: [input, input].map(({ arenaId: _arenaId, ...data }) => data) });

    const propose = (arenaId: string) => runtime.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
      return createLimitedLeagueProposal(tx, { ...input, arenaId });
    });
    const results = await Promise.allSettled([propose(arenaA.id), propose(arenaA.id)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1,
      results.map((result) => result.status === "rejected" ? String(result.reason) : "fulfilled").join(" | "));
    const rejected = results.find((result) => result.status === "rejected");
    assert.equal(rejected?.status, "rejected");
    assert.match(String(rejected.reason), /três sugestões/);
    assert.equal(await admin.leagueMatchProposal.count({ where: { categoryMatchId: match.id } }), 3);
    await assert.rejects(propose(arenaB.id), /Não existe jogo pendente/);
    assert.equal(await admin.leagueMatchProposal.count({ where: { categoryMatchId: match.id } }), 3);
  } finally {
    if (matchId) await admin.categoryMatch.delete({ where: { id: matchId } });
    if (pairIds.length) await admin.categoryPair.deleteMany({ where: { id: { in: pairIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
