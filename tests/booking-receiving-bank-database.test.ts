import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z as requireZod } from "zod";
import { PrismaClient, type Prisma } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import * as inputs from "../src/lib/calendar/inputs";
import * as resources from "../src/lib/calendar/booking-services";
import * as holds from "../src/lib/calendar/online-booking-hold";
import { isFixedBookingType } from "../src/lib/calendar/booking-types";
import { assertCourtBookingMayBeEdited } from "../src/lib/calendar/court-booking-edit-safety";
import { expandWeeklyOccurrences } from "../src/lib/scheduling/recurrence";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("Grade exige conta ativa por recebimento, preserva reservas em aberto e cobra apenas o primeiro horário da série", { skip: !local }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  const suffix = randomUUID();
  let canSettle = true;
  try {
    for (const label of ["a", "b"]) arenas.push((await admin.arena.create({ data: { name: `Recebimento grade ${label}`, slug: `grade-bancos-${label}-${suffix}`, createdById: "goal-test" } })).id);
    const [arenaId, foreignId] = arenas;
    const court = await admin.court.create({ data: { arenaId, name: "Quadra de teste" } });
    const players = await Promise.all(["A", "B"].map(name => admin.player.create({ data: { arenaId, name: `Atleta ${name}` } })));
    const bankA = await admin.bankAccount.create({ data: { arenaId, name: "Conta A" } });
    const bankB = await admin.bankAccount.create({ data: { arenaId, name: "Conta B" } });
    const inactive = await admin.bankAccount.create({ data: { arenaId, name: "Conta inativa", active: false } });
    const foreign = await admin.bankAccount.create({ data: { arenaId: foreignId, name: "Conta de outra arena" } });
    const scope = <T>(id: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return fn(tx); });
    const actions: Record<string, (data: FormData) => Promise<{ error?: string }>> = {};
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requirePermission: async (permission: string) => { if (permission === "finance:receivable:settle" && !canSettle) throw new Error("Sem permissão financeira."); return { arenaId, userId: "goal-test" }; } },
      "@/lib/arena-database": { arenaDatabase: (id: string) => arenaDatabaseForTest(runtime, id) },
      "@/lib/rls": { withArenaTransaction: scope },
      "@/lib/calendar/inputs": inputs,
      "@/lib/calendar/booking-services": resources,
      "@/lib/calendar/booking-types": { isFixedBookingType },
      "@/lib/calendar/court-booking-edit-safety": { assertCourtBookingMayBeEdited },
      "@/lib/calendar/online-booking-hold": holds,
      "@/lib/scheduling/recurrence": { expandWeeklyOccurrences },
      "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount },
      "@/lib/calendar/revalidation": { refreshCalendarRoutes() {} },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, Error, console: { error() {} }, require: (name: string) => mocks[name] ?? (name === "zod" ? { z: requireZod } : {}) });
    const payer = (index: number, bankAccountId = "", paymentMethod = "PIX") => ({ playerId: players[index].id, amountCents: 6000, paymentMethod, bankAccountId });
    const form = (participants: ReturnType<typeof payer>[], date = "2040-01-02", extra: Record<string, string> = {}) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ occurrenceId: "", courtId: court.id, courtIds: JSON.stringify([court.id]), title: "Reserva QA", startsAt: `${date}T10:00`, durationMinutes: "60", bookingTypeName: "Reserva", repeatUntil: "", teacherId: "", responsiblePlayerId: players[0].id, notes: "", participants: JSON.stringify(participants), ...extra })) data.set(key, value);
      return data;
    };
    for (const bank of ["", inactive.id, foreign.id]) assert.match((await actions.saveCourtBookingAction(form([payer(0, bank)]))).error ?? "", /conta bancária/);
    assert.equal(await admin.scheduleOccurrence.count({ where: { arenaId } }), 0);
    assert.equal(await admin.financialEntry.count({ where: { arenaId } }), 0);
    canSettle = false;
    assert.ok((await actions.saveCourtBookingAction(form([payer(0, bankA.id)]))).error);
    assert.equal(await admin.scheduleOccurrence.count({ where: { arenaId } }), 0);
    canSettle = true;
    assert.equal((await actions.saveCourtBookingAction(form([payer(0, bankA.id), payer(1, bankB.id)]))).error, undefined);
    const paid = await admin.financialEntry.findMany({ where: { arenaId }, include: { settlements: true }, orderBy: { playerId: "asc" } });
    assert.equal(paid.length, 2);
    for (const [index, player] of players.entries()) {
      const entry = paid.find(row => row.playerId === player.id)!;
      assert.equal(entry.status, "PAID"); assert.equal(entry.bankAccountId, index === 0 ? bankA.id : bankB.id);
      assert.equal(entry.settlements.length, 1); assert.equal(entry.settlements[0].bankAccountId, entry.bankAccountId);
      assert.equal(entry.settlements[0].amountCents, 6000);
    }
    const occurrence = await admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId } });
    assert.match((await actions.saveCourtBookingAction(form([payer(0, bankA.id)], "2040-01-02", { occurrenceId: occurrence.id }))).error ?? "", /já tem pagamento/);
    assert.equal(await admin.financialSettlement.count({ where: { arenaId } }), 2);
    canSettle = false;
    assert.equal((await actions.saveCourtBookingAction(form([payer(0, "", "")], "2040-01-03"))).error, undefined);
    canSettle = true;
    assert.equal((await actions.saveCourtBookingAction(form([payer(0, bankA.id)], "2040-01-07", { bookingTypeName: "Reserva fixa", repeatUntil: "2040-01-21" }))).error, undefined);
    const series = await admin.scheduleOccurrence.findMany({ where: { arenaId, bookingSeriesId: { not: null } }, orderBy: { startsAt: "asc" }, include: { participants: { include: { financialEntry: { include: { settlements: true } } } } } });
    assert.equal(series.length, 3);
    assert.equal(series[0].participants[0].financialEntry!.bankAccountId, bankA.id);
    assert.equal(series[0].participants[0].financialEntry!.settlements.length, 1);
    for (const future of series.slice(1)) { assert.equal(future.participants[0].financialEntry!.status, "PENDING"); assert.equal(future.participants[0].financialEntry!.settlements.length, 0); }
  } finally {
    await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.financialEntry.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
