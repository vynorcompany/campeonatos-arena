import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { arenaWallClockToInstant, instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { activeCourtOccurrenceWhere } from "../src/lib/calendar/online-booking-hold";
import { buildDashboardAnalytics } from "../src/lib/reports/dashboard-analytics";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL || "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("dashboard projection reads remain tenant scoped, reconcile posted and virtual charges, and never materialize future invoices", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  try {
    for (const label of ["A", "B"]) arenas.push((await admin.arena.create({ data: { name: `Dashboard Forecast QA ${label}`, slug: `dash-forecast-${randomUUID()}`, createdById: "goal-test" } })).id);
    const arenaId = arenas[0], from = new Date("2032-01-01T00:00:00"), to = new Date("2032-01-31T23:59:59.999"), horizon = new Date("2032-03-31T23:59:59.999");
    const player = await admin.player.create({ data: { arenaId, name: "Cliente de previsão QA" } });
    const recurrence = await admin.financialRecurrence.create({ data: { arenaId, type: "REVENUE", category: "Planos", counterpartyName: player.name, playerId: player.id, description: "Plano QA", amountCents: 10000, frequency: "MONTHLY", startsAt: new Date("2032-01-31T12:00:00"), nextDueDate: new Date("2032-01-31T12:00:00"), endsAt: new Date("2032-03-31T12:00:00") } });
    await admin.financialEntry.create({ data: { arenaId, type: "REVENUE", category: "Planos", description: "Mensalidade já lançada", amountCents: 10000, recurrenceId: recurrence.id, playerId: player.id, dueDate: new Date("2032-01-31T12:00:00"), settlements: { create: { arenaId, amountCents: 2000, paidAt: new Date("2031-12-20T12:00:00"), paymentMethod: "Pix" } } } });
    await admin.financialEntry.create({ data: { arenaId, type: "REVENUE", category: "Planos", description: "Ocorrência anulada", amountCents: 10000, recurrenceId: recurrence.id, status: "VOIDED", dueDate: new Date("2032-02-29T12:00:00") } });
    await admin.financialEntry.create({ data: { arenaId: arenas[1], type: "REVENUE", category: "Privado", description: "Receita de outra arena", amountCents: 99999999, dueDate: new Date("2032-01-10T12:00:00") } });
    const court = await admin.court.create({ data: { arenaId, name: "Quadra QA", weeklyRules: { create: { weekday: 1, startsAtMinute: 480, endsAtMinute: 1320 } } } });
    await admin.scheduleOccurrence.create({ data: { arenaId, sourceType: "BOOKING", title: "Reserva sem lançamento QA", startsAt: new Date("2032-01-05T12:00:00"), endsAt: new Date("2032-01-05T13:00:00"), occurrenceCourts: { create: { courtId: court.id } }, participants: { create: { playerId: player.id, amountCents: 3000 } } } });
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/reports/dashboard-data.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports,
      require: (name: string) => {
        if (name === "@/lib/calendar/arena-wall-clock") return { arenaWallClockToInstant, instantToArenaWallClock };
        if (name === "@/lib/rls") return { withArenaTransaction: (scope: string, operation: any) => { assert.equal(scope, arenaId); return arenaDatabaseForTest(runtime, scope).$transaction(operation); } };
        if (name === "@/lib/calendar/online-booking-hold") return { activeCourtOccurrenceWhere };
        throw new Error(`Unexpected dependency ${name}`);
      },
    });
    assert.deepEqual(await runtime.financialEntry.findMany({ where: { arenaId } }), []);
    const data = await exports.loadDashboardData(arenaId, from, to, horizon);
    const result = buildDashboardAnalytics(data, from, to, horizon, "caixa");
    assert.equal(result.received, 0);
    assert.match(String(result.cards.find(card => card.id === "to-receive")?.value), /110,00/);
    assert.match(String(result.cards.find(card => card.id === "forecast")?.value), /130,00/);
    assert.equal(result.forecastCourts.reduce((total, item) => total + item.value, 0), 13000);
    assert.equal(result.months.reduce((total, item) => total + item.value, 0), 23000);
    assert.equal(data.entries.length, 2);
    assert.equal(await admin.financialEntry.count({ where: { arenaId } }), 2, "projection must remain read-only");
    assert.ok(!JSON.stringify(data).includes("Receita de outra arena"));
  } finally { await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: arenas } } }); await admin.arena.deleteMany({ where: { id: { in: arenas } } }); await Promise.all([admin.$disconnect(), runtime.$disconnect()]); }
});
