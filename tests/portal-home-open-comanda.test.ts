import { portalCheckoutPolicy } from "../src/lib/payments/portal-checkout-policy";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("a tela inicial não diz que está tudo em dia quando há comanda aberta", async () => {
  const source = readFileSync(new URL("../src/lib/services/public-client-home.ts", import.meta.url), "utf8");
  const exports: Record<string, (...args: string[]) => Promise<unknown>> = {};
  const comandaQueries: Array<Record<string, unknown>> = [];
  let openComandas: Array<{ id: string; code: string; openedAt?: Date; openedByUserName?: string; bookingServices?: { id: string; amountCents: number }[]; items: { totalCents: number; id?: string; quantity?: number; product?: { name: string } }[] }> = [{ id: "comanda-a", code: "GOAL-1", items: [{ totalCents: 1200 }] }];
  let consumptionEnabled = true;
  const tx = {
    arenaOperationalSettings: { findUnique: async () => ({ portalConsumptionEnabled: consumptionEnabled }) },
    product: { findMany: async () => [] },
    productCategory: { findMany: async () => [] },
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
    "@/lib/comandas/booking-service": { bookingServicesInclude: { include: { participant: true } }, bookingServiceRows: (rows: unknown[]) => rows },
    "@/lib/prisma": { prisma: { arena: { findUnique: async () => ({ id: "arena-a" }) } } },
    "@/lib/payments/portal-checkout-policy": { portalCheckoutPolicy },
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

  // The reservation receivable remains separate in Finance; its linked service
  // must still be visible in the comanda alongside products, exactly once.
  openComandas = [{ id: "comanda-a", code: "GOAL-1", openedAt: new Date(), openedByUserName: "Recepção QA", bookingServices: [{ id: "service-a", amountCents: 2500 }], items: [{ id: "item-a", quantity: 1, totalCents: 500, product: { name: "Água" } }] }];
  const commands = await exports.getPublicClientComandas("arena-a", "player-a") as { comandas: { totalCents: number; openedBy: string; bookingServices: unknown[] }[] };
  assert.equal(commands.comandas[0].totalCents, 3000);
  assert.equal(commands.comandas[0].openedBy, "Recepção QA");
  assert.equal(commands.comandas[0].bookingServices.length, 1);
  assert.equal((comandaQueries.at(-1)?.include as { bookingServices: unknown }).bookingServices !== undefined, true);

  openComandas = [];
  const empty = await exports.getPublicClientHome("arena-a", "player-a") as { summary: { financial: string; financialStatus: string; mobileFinancialStatus: string; mobileFinancialLabel: string } };
  assert.equal(empty.summary.financial, "Em dia");
  assert.equal(empty.summary.financialStatus, "active");
  assert.equal(empty.summary.mobileFinancialStatus, "healthy");
  assert.equal(empty.summary.mobileFinancialLabel, "Tudo em dia");
  consumptionEnabled = false;
  openComandas = [{ id: "secret-comanda", code: "PRIVATE-CONSUMPTION", items: [{ totalCents: 98765 }] }];
  const hiddenHome = await exports.getPublicClientHome("arena-a", "player-a") as { financialVisible: boolean; charges: unknown[]; summary: { financial: string } };
  assert.equal(hiddenHome.financialVisible, false); assert.equal(hiddenHome.charges.length, 0);
  assert.doesNotMatch(JSON.stringify(hiddenHome), /PRIVATE-CONSUMPTION|98765|987,65/);
  const hiddenFinance = await exports.getPublicClientFinance("arena-a", "player-a") as { disabled: boolean; comandas: unknown[]; overdue: unknown[]; open: unknown[]; paid: unknown[] };
  assert.equal(hiddenFinance.disabled, true); assert.equal(hiddenFinance.comandas.length + hiddenFinance.overdue.length + hiddenFinance.open.length + hiddenFinance.paid.length, 0);
  const before = comandaQueries.length;
  const hiddenCommands = await exports.getPublicClientComandas("arena-a", "player-a") as { disabled: boolean; comandas: unknown[]; products: unknown[] };
  assert.equal(hiddenCommands.disabled, true); assert.equal(hiddenCommands.comandas.length + hiddenCommands.products.length, 0); assert.equal(comandaQueries.length, before);

});
