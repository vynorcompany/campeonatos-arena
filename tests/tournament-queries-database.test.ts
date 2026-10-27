import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("tournament read module preserves results and isolates every query with the restricted database role", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  try {
    for (const label of ["A", "B"]) ids.push((await admin.arena.create({ data: { name: `Query QA ${label}`, slug: `query-${randomUUID()}`, createdById: "goal-test" } })).id);
    const drafts = [];
    const finished = [];
    for (const arenaId of ids) {
      await admin.player.create({ data: { arenaId, name: `Player ${arenaId}` } });
      drafts.push(await admin.tournament.create({ data: { arenaId, name: "Active", status: "DRAFT" } }));
      finished.push(await admin.tournament.create({ data: { arenaId, name: "Finished", status: "FINISHED" } }));
    }
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/services/tournament-queries.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports,
      require(name: string) {
        assert.equal(name, "@/lib/arena-database");
        return { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) };
      },
    });
    const dashboard = await exports.getArenaDashboard(ids[0]);
    assert.deepEqual(Array.from(dashboard.activeTournaments, (row: any) => row.id), [drafts[0].id]);
    assert.deepEqual(Array.from(dashboard.tournamentHistory, (row: any) => row.id), [finished[0].id]);
    assert.equal(dashboard.players.length, 1);
    assert.equal(dashboard.players[0].arenaId, ids[0]);
    assert.equal(dashboard.activeTournament.id, drafts[0].id);
    assert.equal((await exports.getArenaDashboard(ids[0], drafts[1].id)).activeTournament, null);
    assert.equal((await exports.getTournamentDetailsById(drafts[0].id, ids[0])).id, drafts[0].id);
    assert.equal(await exports.getTournamentDetailsById(drafts[1].id, ids[0]), null);
    assert.equal((await exports.getFinishedTournamentDetails(finished[0].id, ids[0])).id, finished[0].id);
    assert.equal(await exports.getFinishedTournamentDetails(finished[1].id, ids[0]), null);
    assert.equal(await exports.getFinishedTournamentDetails(drafts[0].id, ids[0]), null);
    assert.equal((await exports.getTournamentScheduleConflicts(drafts[1].id, ids[0])).length, 0);
  } finally {
    try { await admin.arena.deleteMany({ where: { id: { in: ids } } }); }
    finally { await runtime.$disconnect(); await admin.$disconnect(); }
  }
});
