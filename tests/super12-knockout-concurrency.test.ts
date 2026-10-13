import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { compareSuper12CrossGroupPairs, compareSuper12GroupPairs } from "../src/lib/super12/ranking";
import { super12GroupSetupError } from "../src/lib/super12/format";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("Super 12 não duplica fases nem altera placares que já definiram a chave", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const require = createRequire(import.meta.url);
  let eventId = "";
  let firstGroupMatchId = "";
  try {
    const arena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const creator = await db.player.findFirstOrThrow({ where: { arenaId: arena.id, id: "goal-athlete-a" }, select: { id: true } });
    const event = await db.super12Event.create({ data: { arenaId: arena.id, creatorId: creator.id, name: "Chave simultânea descartável GOAL", format: "GROUPS", groupCount: 4, knockoutQualification: "TOP_TWO" }, select: { id: true } });
    eventId = event.id;
    for (let groupIndex = 0; groupIndex < 4; groupIndex += 1) {
      const group = await db.super12Group.create({ data: { eventId, name: `Grupo ${groupIndex + 1}`, drawOrder: groupIndex + 1 }, select: { id: true } });
      const home = await db.super12Pair.create({ data: { eventId, groupId: group.id, name: `Dupla ${groupIndex + 1}A`, drawOrder: groupIndex * 2 + 1 }, select: { id: true } });
      const away = await db.super12Pair.create({ data: { eventId, groupId: group.id, name: `Dupla ${groupIndex + 1}B`, drawOrder: groupIndex * 2 + 2 }, select: { id: true } });
      const match = await db.super12Match.create({ data: { eventId, groupId: group.id, homePairId: home.id, awayPairId: away.id, roundOrder: groupIndex + 1, homeScore: 6, awayScore: 2 }, select: { id: true } });
      if (groupIndex === 0) firstGroupMatchId = match.id;
    }

    const source = readFileSync(new URL("../src/lib/actions/public-super12.ts", import.meta.url), "utf8");
    const exports: Record<string, (data: FormData) => Promise<{ error: string | null }>> = {};
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath: () => {} },
      zod: require("zod"),
      "@/lib/prisma": { prisma: db },
      "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: arena.id, playerId: creator.id }) },
      "@/lib/super12/ranking": { compareSuper12CrossGroupPairs, compareSuper12GroupPairs },
      "@/lib/super12/format": { super12GroupSetupError },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, FormData,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`); return mocks[name]; },
    });
    const form = new FormData();
    form.set("arenaSlug", "arena-teste-goal");
    form.set("eventId", eventId);
    const scoreForm = new FormData();
    scoreForm.set("arenaSlug", "arena-teste-goal");
    scoreForm.set("matchId", firstGroupMatchId);
    scoreForm.set("homeScore", "6");
    scoreForm.set("awayScore", "3");
    assert.equal((await exports.recordSuper12ScoreAction(scoreForm)).error, null);
    const results = await Promise.all([exports.advanceSuper12KnockoutAction(form), exports.advanceSuper12KnockoutAction(form)]);
    assert.equal(results.filter((result) => result.error === null).length, 1);
    assert.equal(await db.super12Match.count({ where: { eventId, stage: "QUARTAS DE FINAL", roundNumber: 1 } }), 4);
    assert.match((await exports.recordSuper12ScoreAction(scoreForm)).error ?? "", /próxima fase já foi liberada/);
    assert.equal((await db.super12Match.findUniqueOrThrow({ where: { id: firstGroupMatchId }, select: { awayScore: true } })).awayScore, 3);

    const quarterfinals = await db.super12Match.findMany({ where: { eventId, roundNumber: 1 }, select: { id: true } });
    await db.super12Match.updateMany({ where: { eventId, roundNumber: 1 }, data: { homeScore: 6, awayScore: 2 } });
    assert.equal((await exports.advanceSuper12KnockoutAction(form)).error, null);
    assert.equal(await db.super12Match.count({ where: { eventId, stage: "SEMIFINAL", roundNumber: 2 } }), 2);
    scoreForm.set("matchId", quarterfinals[0].id);
    assert.match((await exports.recordSuper12ScoreAction(scoreForm)).error ?? "", /próxima fase já foi liberada/);
    const semifinal = await db.super12Match.findFirstOrThrow({ where: { eventId, roundNumber: 2 }, select: { id: true } });
    scoreForm.set("matchId", semifinal.id);
    assert.equal((await exports.recordSuper12ScoreAction(scoreForm)).error, null);
    assert.equal((await exports.finishSuper12Action(form)).error, null);
    assert.match((await exports.recordSuper12ScoreAction(scoreForm)).error ?? "", /Somente quem criou/);
  } finally {
    if (eventId) await db.super12Event.delete({ where: { id: eventId } });
    await db.$disconnect();
  }
});
