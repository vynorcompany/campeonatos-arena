import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { buildCategoryBracketSeeds, hasStartedCategoryBracket } from "../src/lib/tournament/bracket";

const source = readFileSync(new URL("../src/lib/actions/tournament.ts", import.meta.url), "utf8");

function loadActions(tx: Record<string, unknown>) {
  const events: string[] = [];
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath: () => events.push("revalidate") },
    "@/lib/prisma": { prisma: { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) } },
    "@/lib/rls": { withArenaTransaction: async (arenaId: string, run: (client: typeof tx) => Promise<unknown>) => { events.push(`context:${arenaId}`); return run(tx); } },
    "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: "arena-a" }), requireTournamentMatchEdit: async () => ({ arenaId: "arena-a" }) },
    "@/lib/tournaments/registration-order": { lockTournamentRegistrations: async () => { events.push("lock-tournament"); } },
    "@/lib/tournament/bracket": { buildCategoryBracketSeeds, hasStartedCategoryBracket },
    "@/lib/tournament/revalidation": { refreshTournamentRoutes: () => events.push("refresh") },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, FormData, Date, console, require: (name: string) => mocks[name] ?? {},
  });
  return { actions: exports, events };
}

test("montagem lê inscrições após os bloqueios e não apaga jogos agendados", async () => {
  const tx = {
    tournament: { findFirst: async () => ({ registrationPhase: "LIVE" }) },
    $queryRaw: async () => { events.push("lock-category"); return [{ id: "category-a" }]; },
    publicTournamentRegistration: { findMany: async () => { events.push("read-registrations"); return [{ id: "r1" }, { id: "r2" }]; } },
    categoryBracket: {
      findFirst: async () => ({ id: "bracket-a", matches: [{ scheduledTime: "19:00", courtName: "Quadra 1", status: "WAITING", winnerRegistrationId: null }] }),
      upsert: async () => { events.push("upsert-bracket"); return { id: "bracket-a" }; },
    },
    categoryBracketMatch: { deleteMany: async () => { events.push("delete-matches"); } },
  };
  const { actions, events } = loadActions(tx);
  const form = new FormData();
  form.set("tournamentId", "tournament-a");
  form.set("categoryId", "category-a");
  await assert.rejects(actions.generateCategoryBracketAction(form), /já possui jogos agendados/);
  assert.deepEqual(events, ["context:arena-a", "lock-tournament", "lock-category", "read-registrations"]);
});

test("montagem recusa inscrição ainda aberta mesmo com envio direto do formulário", async () => {
  let touchedCategory = false;
  const tx = {
    tournament: { findFirst: async () => ({ registrationPhase: "REGISTRATIONS" }) },
    $queryRaw: async () => { touchedCategory = true; return [{ id: "category-a" }]; },
  };
  const { actions, events } = loadActions(tx);
  const form = new FormData();
  form.set("tournamentId", "tournament-a");
  form.set("categoryId", "category-a");
  await assert.rejects(actions.generateCategoryBracketAction(form), /Encerre as inscrições/);
  assert.deepEqual(events, ["context:arena-a", "lock-tournament"]);
  assert.equal(touchedCategory, false);
});

test("formato da categoria não pode mudar enquanto as inscrições estão abertas", async () => {
  let updated = false;
  const tx = {
    tournament: { findFirst: async () => ({ registrationPhase: "REGISTRATIONS" }) },
    tournamentCategory: { updateMany: async () => { updated = true; return { count: 1 }; } },
  };
  const { actions, events } = loadActions(tx);
  const form = new FormData();
  form.set("tournamentId", "tournament-a");
  form.set("categoryId", "category-a");
  form.set("groupCount", "4");
  form.set("pairsPerGroup", "3");
  await assert.rejects(actions.updateTournamentCategoryFormatAction(form), /Encerre as inscrições/);
  assert.equal(updated, false);
  assert.deepEqual(events, ["lock-tournament"]);
});

test("formato de categoria fechada só é alterado na arena ativa", async () => {
  const tx = {
    tournament: { findFirst: async () => ({ registrationPhase: "LIVE" }) },
    tournamentCategory: { updateMany: async ({ where, data }: { where: { tournament: { arenaId: string }; id: string }; data: { groupCount: number; pairsPerGroup: number } }) => {
      assert.equal(where.tournament.arenaId, "arena-a");
      assert.equal(where.id, "category-a");
      assert.equal(data.groupCount, 4);
      assert.equal(data.pairsPerGroup, 3);
      return { count: 1 };
    } },
  };
  const { actions, events } = loadActions(tx);
  const form = new FormData();
  form.set("tournamentId", "tournament-a");
  form.set("categoryId", "category-a");
  form.set("groupCount", "4");
  form.set("pairsPerGroup", "3");
  await actions.updateTournamentCategoryFormatAction(form);
  assert.deepEqual(events, ["lock-tournament", "revalidate", "revalidate"]);
});

test("agendamento rejeita jogo de outra arena antes de alterar dados", async () => {
  let changed = false;
  const tx = {
    categoryBracketMatch: {
      findFirst: async ({ where }: { where: { bracket: { tournament: { arenaId: string } } } }) => {
        assert.equal(where.bracket.tournament.arenaId, "arena-a");
        return null;
      },
      updateMany: async () => { changed = true; return { count: 1 }; },
    },
  };
  const { actions } = loadActions(tx);
  const form = new FormData();
  form.set("matchId", "match-arena-b");
  await assert.rejects(actions.updateCategoryBracketMatchScheduleAction(form), /Jogo não encontrado nesta arena/);
  assert.equal(changed, false);
});

test("agendamento do jogo da arena ativa bloqueia a categoria e salva", async () => {
  const steps: string[] = [];
  const tx = {
    $queryRaw: async () => { steps.push("lock-category"); return [{ id: "category-a" }]; },
    categoryBracketMatch: {
      findFirst: async () => { steps.push("read-match"); return { bracket: { categoryId: "category-a" } }; },
      updateMany: async ({ where, data }: { where: { id: string; bracket: { tournament: { arenaId: string } } }; data: { scheduledTime: string; courtName: string } }) => {
        steps.push("update-match");
        assert.equal(where.id, "match-a");
        assert.equal(where.bracket.tournament.arenaId, "arena-a");
        assert.equal(data.scheduledTime, "19:00");
        assert.equal(data.courtName, "Quadra 1");
        return { count: 1 };
      },
    },
  };
  const { actions, events } = loadActions(tx);
  const form = new FormData();
  form.set("matchId", "match-a");
  form.set("scheduledTime", "19:00");
  form.set("courtName", "Quadra 1");
  await actions.updateCategoryBracketMatchScheduleAction(form);
  assert.deepEqual(steps, ["read-match", "lock-category", "update-match"]);
  assert.deepEqual(events, ["revalidate"]);
});
