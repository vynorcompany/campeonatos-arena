import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadReset(arenaId: string | null) {
  const events: string[] = [];
  const tx = {
    publicTournamentRegistration: { updateMany: async ({ where }: { where: { competitionId: string } }) => { events.push(`registrations:${where.competitionId}`); } },
    categoryMatch: { deleteMany: async () => { events.push("matches"); } },
    categoryPair: { deleteMany: async () => { events.push("pairs"); } },
    categoryGroup: { deleteMany: async () => { events.push("groups"); } },
    categoryCompetition: { update: async () => { events.push("competition"); } },
  };
  const source = `${readFileSync(new URL("../src/lib/league/lifecycle.ts", import.meta.url), "utf8")}\nexports.__resetLeagueCompetition = resetLeagueCompetition;`;
  const exports: Record<string, (competitionId: string) => Promise<void>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "@/lib/prisma") return { prisma: { categoryCompetition: { findUnique: async () => arenaId ? { category: { tournament: { arenaId } } } : null } } };
      if (name === "@/lib/league/monthly-schedule") return {};
      if (name === "@/lib/league/tier") return {};
      if (name === "@/lib/arena-database") return { arenaDatabase: () => ({}) };
      if (name === "@/lib/rls") return { withArenaTransaction: async (scopedArenaId: string, operation: (client: typeof tx) => Promise<void>) => { events.push(`context:${scopedArenaId}`); return operation(tx); } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { reset: exports.__resetLeagueCompetition, events };
}

test("encerramento mensal cancela inscrições no contexto da arena proprietária", async () => {
  const { reset, events } = loadReset("arena-a");
  await reset("competition-a");
  assert.deepEqual(events, ["context:arena-a", "registrations:competition-a", "matches", "pairs", "groups", "competition"]);
});

test("competição inexistente não abre transação nem cancela inscrições", async () => {
  const { reset, events } = loadReset(null);
  await assert.rejects(reset("competition-missing"), /não encontrada/);
  assert.deepEqual(events, []);
});
