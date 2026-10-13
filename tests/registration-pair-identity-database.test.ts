import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { ensureTournamentPairFromRegistration } from "../src/lib/services/registration-pair";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("duas pessoas homônimas usam CPF ou ID sem cruzar arenas", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da dupla homônima");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const unique = Date.now();
      const name = `Atleta Homônimo GOAL ${unique}`;
      const lead = await tx.player.create({ data: { arenaId: arenaA.id, name, cpf: "11111111111" } });
      const partner = await tx.player.create({ data: { arenaId: arenaA.id, name, cpf: "22222222222" } });
      const otherArenaPlayer = await tx.player.create({ data: { arenaId: arenaB.id, name, cpf: "33333333333" } });
      const tournament = await tx.tournament.create({ data: { arenaId: arenaA.id, name: "Torneio CPF GOAL", publicSlug: `goal-cpf-${unique}` } });

      await ensureTournamentPairFromRegistration(tx, { arenaId: arenaA.id, tournamentId: tournament.id, leadName: name, partnerName: name, leadCpf: lead.cpf, partnerCpf: partner.cpf });
      const pair = await tx.pair.findFirstOrThrow({ where: { tournamentId: tournament.id }, include: { players: true } });
      assert.deepEqual(new Set(pair.players.map((item) => item.playerId)), new Set([lead.id, partner.id]));
      await ensureTournamentPairFromRegistration(tx, { arenaId: arenaA.id, tournamentId: tournament.id, leadName: name, partnerName: name, leadCpf: lead.cpf, partnerCpf: partner.cpf });
      assert.equal(await tx.pair.count({ where: { tournamentId: tournament.id } }), 1);

      await assert.rejects(ensureTournamentPairFromRegistration(tx, { arenaId: arenaA.id, tournamentId: tournament.id, leadName: name, partnerName: name, leadPlayerId: otherArenaPlayer.id, partnerPlayerId: partner.id }), /não encontrado nesta arena/);
      assert.equal(await tx.pair.count({ where: { tournamentId: tournament.id } }), 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
