import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("tenant context can only select an arena the user belongs to", () => {
  const session = read("src/lib/auth/session.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(session, /memberships\.find\(\(membership\) => membership\.arenaId === selectedArenaId\)/);
  assert.match(schema, /@@unique\(\[userId, arenaId\]\)/);
});

test("troca de arena rejeita IDs alheios antes de gravar o cookie", async () => {
  const source = read("src/lib/auth/actions.ts");
  const selected: string[] = [];
  const exports: Record<string, (form: FormData) => Promise<void>> = {};
  const redirect = (path: string): never => { throw new Error(`redirect:${path}`); };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports,
    FormData,
    require: (name: string) => {
      if (name === "next/navigation") return { redirect };
      if (name === "@/lib/auth/session") return {
        getAuthContext: async () => ({ memberships: [{ arenaId: "arena-a" }] }),
        setArenaContextCookie: async (arenaId: string) => { selected.push(arenaId); },
      };
      if (name === "bcryptjs") return { default: {} };
      return {};
    },
  });

  const form = new FormData();
  form.set("arenaId", "arena-b");
  await assert.rejects(exports.setActiveArenaAction(form), /Arena inválida para este usuário/);
  assert.deepEqual(selected, []);

  form.set("arenaId", "arena-a");
  await assert.rejects(exports.setActiveArenaAction(form), /redirect:\/painel/);
  assert.deepEqual(selected, ["arena-a"]);
});

test("cookie de arena inválido não altera o contexto para outra subconta", async () => {
  const source = read("src/lib/auth/session.ts");
  let selectedArenaId = "arena-b";
  const exports: Record<string, () => Promise<{ arenaId: string; arenaName: string }>> = {};
  const membership = (arenaId: string, name: string) => ({
    arenaId, role: "STAFF", viewPermissions: ["dashboard"], editPermissions: [],
    arena: { id: arenaId, name, logoUrl: "" }, permissionProfile: null,
  });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "react") return { cache: (callback: unknown) => callback };
      if (name === "next/headers") return { cookies: async () => ({ get: (key: string) => key === "session" ? { value: "token" } : key === "arena" ? { value: selectedArenaId } : undefined }) };
      if (name === "next/navigation") return { redirect: () => { throw new Error("unexpected redirect"); } };
      if (name === "@/lib/env") return { env: { sessionTtlDays: 30, sessionCookieName: "session", arenaCookieName: "arena" } };
      if (name === "@/lib/prisma") return { prisma: { session: { findUnique: async () => ({ expiresAt: new Date(Date.now() + 60_000), user: { id: "user-a", name: "Operador", email: "operator@example.test", systemRole: "VIEWER", memberships: [membership("arena-a", "Arena A"), membership("arena-b", "Arena B")] } }) } } };
      if (name === "@/lib/permissions") return { allPermissionModules: [] };
      if (name === "node:crypto") return { createHash: () => ({ update: () => ({ digest: () => "hash" }) }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });

  assert.equal((await exports.getAuthContext()).arenaId, "arena-b");
  selectedArenaId = "arena-de-outra-conta";
  const fallback = await exports.getAuthContext();
  assert.equal(fallback.arenaId, "arena-a");
  assert.equal(fallback.arenaName, "Arena A");
});

test("portal writes always enforce the active arena in their database predicates", () => {
  const actions = read("src/lib/actions/client-portal.ts");

  assert.match(actions, /portalAnnouncement\.updateMany\(\{ where: \{ id, arenaId: auth\.arenaId \}/);
  assert.match(actions, /calendarEvent\.updateMany\(\{ where: \{ id, arenaId: auth\.arenaId \}/);
  assert.match(actions, /portalEventPost\.create\(\{ data: \{ arenaId: auth\.arenaId/);
});

test("core tenant aggregates carry an arena ownership key", () => {
  const schema = read("prisma/schema.prisma");

  for (const model of ["Player", "Teacher", "Student", "Plan", "ClassGroup", "Court", "ScheduleOccurrence", "FinancialEntry", "Tournament", "PortalEventPost"]) {
    assert.match(schema, new RegExp(`model ${model} \\{[\\s\\S]*?arenaId\\s+String`));
  }
});

test("athlete deletion keeps the arena predicate in the write", () => {
  const actions = read("src/lib/actions/tournament.ts");
  assert.match(actions, /player\.deleteMany\(\{[\s\S]*?id: athlete\.id,[\s\S]*?arenaId: auth\.arenaId/);
});

test("tournament pair actions pass the authorized arena to reads and writes", () => {
  const actions = read("src/lib/actions/tournament.ts");
  const service = read("src/lib/services/tournament.ts");
  assert.match(actions, /generateTournamentPairs\(tournamentId, auth\.arenaId\)/);
  assert.match(actions, /createTournamentPair\(parsed\.data\.tournamentId, auth\.arenaId,/);
  assert.match(service, /generateTournamentPairs\(tournamentId: string, arenaId: string\)[\s\S]*?arenaDatabase\(arenaId\)\.tournament\.findFirst\(\{\s*where: \{ id: tournamentId, arenaId \}/);
  assert.match(service, /createTournamentPair\(tournamentId: string, arenaId: string,[\s\S]*?arenaDatabase\(arenaId\)\.tournament\.findFirst\(\{\s*where: \{ id: tournamentId, arenaId \}/);
  assert.match(service, /if \(tournament\.entries\.length < 2\)[\s\S]*?Inscreva ao menos dois atletas/);
});

test("ranking player relations run with the active arena database context", () => {
  const ranking = read("src/lib/services/ranking.ts");
  assert.match(ranking, /getRankingSourceEntries\(arenaId: string, rankingId: string\)[\s\S]*?arenaDatabase\(arenaId\)\.tournamentPlayer\.findMany/);
  assert.match(ranking, /getRankingSourceEntriesByRankingIds\(arenaId: string, rankingIds: string\[\]\)[\s\S]*?arenaDatabase\(arenaId\)\.tournamentPlayer\.findMany/);
  assert.match(ranking, /getGeneralRankingSourceEntries\([\s\S]*?arenaDatabase\(arenaId\)\.categoryPair\.findMany/);
  assert.match(ranking, /getCategoryPairRankingSourceEntries\([\s\S]*?arenaDatabase\(arenaId\)\.categoryPair\.findMany/);
});

test("athlete portal notification queries enforce the player's arena", () => {
  const notifications = read("src/lib/services/public-player-notifications.ts");
  const radar = read("src/lib/services/public-doubles-radar.ts");
  const league = read("src/lib/services/public-league-portal.ts");
  const linkedPlayers = read("src/lib/services/public-player-link.ts");
  const super12 = read("src/lib/services/public-super12.ts");

  assert.match(notifications, /playerNotification\.findMany\(\{ where: \{ playerId, player: \{ arenaId: arena\.id/);
  assert.match(notifications, /playerPortalNotificationRead\.findMany\(\{ where: \{ playerId, player: \{ arenaId: arena\.id/);
  assert.match(radar, /playerNotification\.findMany\(\{[\s\S]*?player: \{ arenaId: arena\.id/);
  assert.match(league, /playerNotification\.findMany\(\{[\s\S]*?player: \{ arenaId: arena\.id/);
  assert.match(linkedPlayers, /if \(!current\) return \[\]/);
  assert.match(super12, /if \(!availablePlayers\.some\(\(player\) => player\.id === playerId\)\) return null/);
});
