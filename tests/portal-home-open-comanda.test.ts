import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("a tela inicial não diz que está tudo em dia quando há comanda aberta", async () => {
  const source = readFileSync(new URL("../src/lib/services/public-client-home.ts", import.meta.url), "utf8");
  const exports: Record<string, (...args: string[]) => Promise<unknown>> = {};
  const comandaQueries: Array<Record<string, unknown>> = [];
  let openComandas = [{ id: "comanda-a", code: "GOAL-1", items: [{ totalCents: 1200 }] }];
  const tx = {
    player: { findFirst: async () => ({ name: "Atleta GOAL" }) },
    portalAnnouncement: { findMany: async () => [] },
    calendarEvent: { findMany: async () => [] },
    portalEventPost: { findMany: async () => [] },
    student: { findFirst: async () => null },
    scheduleOccurrence: { count: async () => 0, findMany: async () => [] },
    categoryPair: { count: async () => 0 },
    financialEntry: { findMany: async () => [] },
    comanda: { findMany: async (query: Record<string, unknown>) => { comandaQueries.push(query); return openComandas; } },
  };
  const mocks: Record<string, unknown> = {
    "@/lib/prisma": { prisma: { arena: { findUnique: async () => ({ id: "arena-a" }) } } },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, action: (client: typeof tx) => Promise<unknown>) => action(tx) },
    "@/lib/finance/settlements": { getOutstandingCents: (amount: number) => amount },
    "@/lib/portal/financial-status": { getPortalDueUrgency: () => "normal" },
    "@/lib/portal/finance-entries": { loadPortalFinancialEntries: async () => [[], []] },
    "@/lib/portal/upcoming-reservations": { upcomingPlayerReservationsWhere: () => ({}) },
    "@/lib/calendar/arena-wall-clock": { arenaToday: () => new Date("2030-01-10T12:00:00.000Z"), instantToArenaWallClock: (value: Date) => value },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, Intl,
    require: (name: string) => { if (!(name in mocks)) throw new Error(`Import inesperado: ${name}`); return mocks[name]; },
  });
  const open = await exports.getPublicClientHome("arena-a", "player-a") as { summary: { financial: string; financialStatus: string; mobileFinancialStatus: string; mobileFinancialLabel: string } };
  assert.deepEqual(JSON.parse(JSON.stringify(open.summary)), {
    financial: "R$ 12,00 em aberto", futureFinancial: null, financialStatus: "pending",
    mobileFinancialStatus: "soon", mobileFinancialLabel: "Comanda em aberto", classes: 0, reservations: 0, leagues: 0,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(comandaQueries[0].where)), { arenaId: "arena-a", playerId: "player-a", status: "OPEN", items: { some: {} } });

  const finance = await exports.getPublicClientFinance("arena-a", "player-a") as { health: string; headline: string; detail: string; comandas: unknown[] };
  assert.equal(finance.health, "upcoming");
  assert.equal(finance.headline, "Comanda em aberto");
  assert.match(finance.detail, /Acompanhe o consumo/);
  assert.equal(finance.comandas.length, 1);

  openComandas = [];
  const empty = await exports.getPublicClientHome("arena-a", "player-a") as { summary: { financial: string; financialStatus: string; mobileFinancialStatus: string; mobileFinancialLabel: string } };
  assert.equal(empty.summary.financial, "Em dia");
  assert.equal(empty.summary.financialStatus, "active");
  assert.equal(empty.summary.mobileFinancialStatus, "healthy");
  assert.equal(empty.summary.mobileFinancialLabel, "Tudo em dia");
});
