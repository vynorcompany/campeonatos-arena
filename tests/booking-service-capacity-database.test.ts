import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import * as resources from "../src/lib/calendar/booking-services";
import * as capacity from "../src/lib/calendar/service-capacity";
import * as bookingTypes from "../src/lib/calendar/booking-types";
import { isAgendaManagedBooking } from "../src/lib/calendar/agenda-managed-booking";
import * as inputs from "../src/lib/calendar/inputs";
import * as pricing from "../src/lib/calendar/court-interval-pricing";
import * as holds from "../src/lib/calendar/online-booking-hold";
import * as wallClock from "../src/lib/calendar/arena-wall-clock";
import * as paymentClaims from "../src/lib/calendar/booking-payment-claim";
import * as standards from "../src/lib/calendar/standard-services";
import * as operationalPolicy from "../src/lib/comandas/operational-policy";
import { getBookingDelinquency } from "../src/lib/calendar/booking-delinquency";
import { assertCourtBookingMayBeEdited } from "../src/lib/calendar/court-booking-edit-safety";
import { finalizePaidCourtBooking } from "../src/lib/calendar/paid-booking-finalization";
import { arenaBookingPath } from "../src/lib/arena-booking-path";
import { bookingServicesInclude, bookingServiceRows } from "../src/lib/comandas/booking-service";

const require = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
const at = (hour: number) => new Date(2040, 0, 2, hour);
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
async function fixture(options: { limit?: number; courtPrice?: number; onlinePayment?: boolean } = {}) {
  const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arena = await admin.arena.create({ data: { name: "Resource QA", slug: `resource-${randomUUID()}`, createdById: "goal-test", onlineBookingEnabled: true, onlineBookingRequiresConfirmation: true, onlineBookingPaymentEnabled: options.onlinePayment ?? false, onlineBookingLeadTimeMinutes: 0, scheduleStartMinute: 420, scheduleEndMinute: 1320 } });
  const foreign = await admin.arena.create({ data: { name: "Other resource QA", slug: `resource-foreign-${randomUUID()}`, createdById: "goal-test" } });
  const player = await admin.player.create({ data: { arenaId: arena.id, name: "Resource customer", email: "resource@example.test" } });
  const courts: { id: string }[] = [];
  for (let i = 0; i < 4; i++) courts.push(await admin.court.create({ data: { arenaId: arena.id, name: `Resource court ${i}`, onlineSlotMinutes: 60, onlineDurationMinutes: [60, 120], weeklyRules: { create: { weekday: at(10).getDay(), startsAtMinute: 420, endsAtMinute: 1320, priceCents: options.courtPrice ?? 6000, available: true } } } }));
  const service = await admin.product.create({ data: { arenaId: arena.id, name: "Locação de disparador", isService: true, showOnPortalBooking: true, bookingConcurrentLimit: options.limit ?? 1, priceCents: 1500 } });
  const scope = <T>(arenaId: string, run: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return run(tx); }, { maxWait: 10_000, timeout: 10_000 });
  const auth = { arenaId: arena.id, userId: "goal-test", userName: "Resource operator" };
  const mocks: Record<string, unknown> = {
    "@/lib/calendar/booking-services": resources, "@/lib/calendar/service-capacity": capacity, "@/lib/calendar/standard-services": standards, "@/lib/comandas/operational-policy": operationalPolicy,
    "next/cache": { revalidatePath() {} }, "@/lib/auth/guards": { requireModuleEdit: async () => auth, requirePermission: async () => auth },
    "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId: arena.id, playerId: player.id }) }, "@/lib/prisma": { prisma: runtime },
    "@/lib/arena-database": { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) }, "@/lib/rls": { withArenaTransaction: scope },
    "@/lib/calendar/booking-types": bookingTypes, "@/lib/calendar/agenda-managed-booking": { isAgendaManagedBooking }, "@/lib/calendar/inputs": inputs, "@/lib/calendar/court-interval-pricing": pricing, "@/lib/calendar/online-booking-hold": holds,
    "@/lib/calendar/arena-wall-clock": wallClock, "@/lib/calendar/booking-delinquency": { getBookingDelinquency }, "@/lib/calendar/booking-payment-claim": paymentClaims,
    "@/lib/calendar/court-booking-edit-safety": { assertCourtBookingMayBeEdited }, "@/lib/arena-booking-path": { arenaBookingPath },
    "@/lib/calendar/booking-confirmation-whatsapp": { sendBookingConfirmationForOccurrence: async () => ({ sent: 0, failed: 0 }) },
    "@/lib/calendar/revalidation": { refreshCalendarRoutes() {} }, "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
  };
  const load = (path: string) => { const exports: Record<string, (data: FormData) => Promise<any>> = {}; vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, FormData, Date, Error, crypto: globalThis.crypto, require: (name: string) => mocks[name] ?? (name.startsWith("@/") ? {} : require(name)) }); return exports; };
  const actions = load("../src/lib/actions/calendar.ts"), serviceActions = load("../src/lib/actions/services.ts"), commands = load("../src/lib/actions/comanda.ts");
  const book = (court: number, hour = 10, duration = 60, ids = [service.id], quote = (options.courtPrice ?? 6000) * duration / 60 + 1500) => {
    const data = form({ arenaSlug: arena.slug, courtId: courts[court].id, startsAt: `2040-01-02T${String(hour).padStart(2, "0")}:00`, durationMinutes: String(duration), quotedTotalCents: String(quote) }); for (const id of ids) data.append("serviceIds", id); return actions.createPublicCourtBookingAction(data);
  };
  const cleanup = async () => { const ids = [arena.id, foreign.id]; try { await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialSettlement.deleteMany({ where: { arenaId: { in: ids } } }); await admin.financialEntry.deleteMany({ where: { arenaId: { in: ids } } }); await admin.sale.deleteMany({ where: { arenaId: { in: ids } } }); await admin.comanda.deleteMany({ where: { arenaId: { in: ids } } }); await admin.arena.deleteMany({ where: { id: { in: ids } } }); } finally { await runtime.$disconnect(); await admin.$disconnect(); } };
  return { admin, runtime, arena, foreign, player, service, courts, scope, actions, serviceActions, commands, book, cleanup };
}

test("one equipment unit is shared across courts, retains its quote and is released by customer cancellation", { skip: !enabled }, async () => {
  const f = await fixture(); try {
    const results = await Promise.all([f.book(0), f.book(1)]); assert.equal(results.filter(r => r.ok).length, 1); assert.match(results.find(r => !r.ok).error, /não está disponível/);
    const [reservation] = await f.admin.scheduleServiceReservation.findMany({ where: { arenaId: f.arena.id }, include: { occurrence: { include: { participants: true } } } });
    assert.equal(reservation.priceCents, 1500); assert.equal(reservation.occurrence.participants[0].amountCents, 7500);
    await f.admin.product.update({ where: { id: f.service.id }, data: { name: "Disparador renomeado", priceCents: 1700 } });
    assert.equal((await f.admin.scheduleServiceReservation.findUniqueOrThrow({ where: { id: reservation.id } })).serviceName, "Locação de disparador");
    await f.actions.cancelPublicCourtBookingRequestAction(form({ arenaSlug: f.arena.slug, occurrenceId: reservation.occurrenceId }));
    assert.equal((await f.book(2, 10, 60, [f.service.id], 7700)).ok, true);
    const current = await f.admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId: f.arena.id, status: "PENDING_CONFIRMATION" } });
    const opened = await f.commands.openBookingComandasAction(form({ occurrenceId: current.id })); assert.equal(opened.error, undefined);
    const command = await f.admin.comanda.findFirstOrThrow({ where: { arenaId: f.arena.id, status: "OPEN" }, include: { bookingServices: bookingServicesInclude } });
    const rows = bookingServiceRows(command.bookingServices); assert.match(rows[0].name, /Disparador renomeado/); assert.equal(rows[0].amountCents, 7700);
    assert.equal(await f.admin.financialEntry.count({ where: { arenaId: f.arena.id, amountCents: 7700 } }), 1);
  } finally { await f.cleanup(); }
});

test("capacity uses peak concurrency, accepts adjacent bookings and prevents reducing a committed limit", { skip: !enabled }, async () => {
  const f = await fixture({ limit: 2 }); try {
    assert.equal((await f.book(0, 10)).ok, true); assert.equal((await f.book(1, 11)).ok, true); assert.equal((await f.book(2, 10, 120)).ok, true);
    assert.equal((await f.book(3, 10)).ok, false); assert.equal((await f.book(3, 12)).ok, true);
    await assert.rejects(f.serviceActions.saveServiceAction(form({ id: f.service.id, name: f.service.name, price: "15,00", bookingConcurrentLimit: "1", showOnPortalBooking: "on" })), /2 reservas simultâneas/);
    assert.equal((await f.admin.product.findUniqueOrThrow({ where: { id: f.service.id } })).bookingConcurrentLimit, 2);
  } finally { await f.cleanup(); }
});

test("foreign and hidden services, duplicate choices and stale prices do not create reservations", { skip: !enabled }, async () => {
  const f = await fixture(); try {
    const foreign = await f.admin.product.create({ data: { arenaId: f.foreign.id, name: "Foreign equipment", isService: true, showOnPortalBooking: true, priceCents: 1500 } });
    assert.equal((await f.book(0, 10, 60, [foreign.id])).ok, false); assert.equal((await f.book(0, 10, 60, [f.service.id, f.service.id])).ok, false);
    assert.equal((await f.book(0, 10, 60, [f.service.id], 1)).ok, false);
    await f.admin.product.update({ where: { id: f.service.id }, data: { showOnPortalBooking: false } }); assert.equal((await f.book(0)).ok, false);
    assert.equal(await f.admin.scheduleOccurrence.count({ where: { arenaId: f.arena.id } }), 0);
  } finally { await f.cleanup(); }
});

test("expired equipment holds release capacity and a late payment cannot reclaim another court's equipment", { skip: !enabled }, async () => {
  const f = await fixture({ courtPrice: 0, onlinePayment: true }); try {
    const first = await f.book(0); assert.equal(first.ok, true); assert.equal(first.reservationStatus, "PENDING_PAYMENT"); assert.ok(first.checkoutUrl);
    const old = await f.admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId: f.arena.id } }); await f.admin.scheduleOccurrence.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 16 * 60_000) } });
    assert.equal((await f.book(1)).ok, true);
    assert.equal(await f.scope(f.arena.id, tx => finalizePaidCourtBooking(tx, f.arena.id, old.id)), false);
    assert.equal((await f.admin.scheduleOccurrence.findUniqueOrThrow({ where: { id: old.id } })).status, "CANCELED");
    assert.equal(await f.admin.arenaNotification.count({ where: { arenaId: f.arena.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 1);
    const next = await f.admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId: f.arena.id, status: "PENDING_PAYMENT" } }); assert.equal(await f.scope(f.arena.id, tx => finalizePaidCourtBooking(tx, f.arena.id, next.id)), true);
  } finally { await f.cleanup(); }
});

test("resource bindings enforce RLS and same-arena parents in the database", { skip: !enabled }, async () => {
  const f = await fixture(); try {
    assert.equal((await f.book(0)).ok, true);
    const binding = await f.admin.scheduleServiceReservation.findFirstOrThrow({ where: { arenaId: f.arena.id } });
    assert.equal((await f.runtime.scheduleServiceReservation.findMany({ where: { id: binding.id } })).length, 0);
    assert.equal(await f.scope(f.foreign.id, tx => tx.scheduleServiceReservation.findUnique({ where: { id: binding.id } })), null);
    const other = await f.admin.product.create({ data: { arenaId: f.foreign.id, name: "Other equipment", isService: true } });
    await assert.rejects(f.scope(f.arena.id, tx => tx.scheduleServiceReservation.create({ data: { arenaId: f.arena.id, occurrenceId: binding.occurrenceId, productId: other.id, serviceName: "Wrong owner", priceCents: 0 } })));
    await assert.rejects(f.scope(f.foreign.id, tx => tx.scheduleServiceReservation.update({ where: { id: binding.id }, data: { priceCents: 0 } })));
    assert.equal(await f.admin.scheduleServiceReservation.count({ where: { arenaId: f.arena.id } }), 1);
  } finally { await f.cleanup(); }
});


test("staff rescheduling preserves equipment and refuses a conflicting destination", { skip: !enabled }, async () => {
  const f = await fixture(); try {
    assert.equal((await f.book(0, 10)).ok, true); assert.equal((await f.book(1, 12)).ok, true);
    const original = await f.admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId: f.arena.id, startsAt: at(10) } });
    const change = (hour: number) => f.actions.saveCourtBookingAction(form({ occurrenceId: original.id, courtId: f.courts[2].id, courtIds: JSON.stringify([f.courts[2].id]), title: "Reagendamento QA", startsAt: `2040-01-02T${hour}:00`, durationMinutes: "60", bookingTypeName: "Reserva", repeatUntil: "", teacherId: "", responsiblePlayerId: f.player.id, notes: "", participants: JSON.stringify([{ playerId: f.player.id, amountCents: 7500, paymentMethod: "" }]) }));
    assert.match((await change(12)).error, /não está disponível/);
    assert.equal((await f.admin.scheduleOccurrence.findUniqueOrThrow({ where: { id: original.id } })).startsAt.getTime(), at(10).getTime());
    assert.equal((await change(13)).error, undefined);
    assert.equal((await f.admin.scheduleOccurrence.findUniqueOrThrow({ where: { id: original.id } })).startsAt.getTime(), at(13).getTime());
    assert.equal(await f.admin.scheduleServiceReservation.count({ where: { occurrenceId: original.id, productId: f.service.id } }), 1);
  } finally { await f.cleanup(); }
});
