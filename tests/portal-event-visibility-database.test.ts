import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type CompetitionFormat } from "@prisma/client";
import { portalEventCompetitionWhere } from "../src/lib/portal/event-visibility";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = /^postgres(?:ql)?:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);

test("Portal lista todo formato público, respeita ocultação/arquivamento e isola arenas e ligas privadas", { skip: !disposable }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = process.env.ARENA_GOAL_TEST_RUNTIME_PASSWORD ?? "fixture";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const tournaments: string[] = [], competitions: string[] = [];
  try {
    const own = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const other = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    const make = async (format: CompetitionFormat, options: { public?: boolean; status?: string; arenaId?: string; active?: boolean; archived?: boolean } = {}) => {
      const event = await admin.tournament.create({ data: { arenaId: options.arenaId ?? own.id, name: `Evento público QA ${randomUUID()}`, status: "PUBLISHED", categories: { create: { name: "Categoria QA", level: 1, active: options.active ?? true, competition: { create: { format, status: options.status ?? "DRAFT", isPublic: options.public ?? true } } } } }, include: { categories: { include: { competition: true } } } });
      tournaments.push(event.id); if (options.archived) await admin.tournamentCategory.update({ where: { id: event.categories[0].id }, data: { active: false, archivedAt: new Date() } }); const competition = event.categories[0].competition!; competitions.push(competition.id); return competition;
    };
    const publicRows = await Promise.all((["LEAGUE", "SIMPLE", "TRIO", "THREE_GROUPS", "FOUR_GROUPS"] as CompetitionFormat[]).map(format => make(format)));
    const finished = await make("SIMPLE", { status: "FINISHED" });
    await make("SIMPLE", { public: false, status: "PUBLISHED" });
    await make("TRIO", { active: false }); await make("TRIO", { archived: true }); await make("TRIO", { arenaId: other.id });
    const ownLeague = await make("LEAGUE", { public: false });
    await admin.categoryPair.create({ data: { competitionId: ownLeague.id, name: "Equipe privada QA", players: { create: { playerId: "goal-athlete-a", slot: 1 } } } });
    const read = (players: string[]) => runtime.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${own.id}, true)`;
      return tx.categoryCompetition.findMany({ where: { AND: [portalEventCompetitionWhere(own.id, players), { id: { in: competitions } }] }, select: { id: true } });
    });
    const expected = [...publicRows.map(row => row.id), finished.id].sort();
    assert.deepEqual((await read([])).map(row => row.id).sort(), expected);
    assert.deepEqual((await read(["goal-athlete-a"])).map(row => row.id).sort(), [...expected, ownLeague.id].sort());
    await admin.categoryCompetition.update({ where: { id: publicRows[1].id }, data: { isPublic: false } });
    assert.equal((await read([])).some(row => row.id === publicRows[1].id), false);
    assert.equal(await admin.categoryCompetition.count({ where: { id: { in: competitions } } }), competitions.length, "Ocultar não remove os dados do evento");
  } finally {
    await admin.tournament.deleteMany({ where: { id: { in: tournaments } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
