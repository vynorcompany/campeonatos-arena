import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { activeCourtOccurrenceWhere, onlineBookingHoldCutoff, pendingPlayerOnlineBookingWhere } from "../src/lib/calendar/online-booking-hold";
import { isCourtSlotAvailable } from "../src/lib/calendar/court-slot-availability";
import { finalizePaidCourtBooking } from "../src/lib/calendar/paid-booking-finalization";
import { arenaWallClockToInstant, instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { calculateCourtIntervalPrice, isCourtBookingStartOnGrid } from "../src/lib/calendar/court-interval-pricing";
import { parseScheduledAt } from "../src/lib/calendar/inputs";
import { claimOnlineBookingPaymentMethod, isConfirmedSchedulePaymentMethod } from "../src/lib/calendar/booking-payment-claim";
import { upcomingPlayerReservationsWhere } from "../src/lib/portal/upcoming-reservations";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("a escolha do método não aparece como pagamento confirmado na agenda", () => {
  assert.equal(isConfirmedSchedulePaymentMethod("MERCADO_PAGO_PENDING:PIX"), false);
  assert.equal(isConfirmedSchedulePaymentMethod(""), false);
  assert.equal(isConfirmedSchedulePaymentMethod("Mercado Pago online"), true);
});

test("portal não conta nem exibe reserva cujo prazo de pagamento expirou", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback das reservas do portal");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arena.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const playerId = "goal-athlete-a";
      const now = new Date();
      const startsAt = new Date("2036-03-16T14:00:00.000Z");
      const where = upcomingPlayerReservationsWhere(arena.id, playerId, now);
      const previousCount = await tx.scheduleOccurrence.count({ where });
      const createBooking = (createdAt: Date, status: string) => tx.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "ONLINE_BOOKING", title: "Reserva do portal descartável", startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), status, createdAt, occurrenceCourts: { create: { courtId: court.id } }, participants: { create: { playerId } } }, select: { id: true } });
      const expired = await createBooking(new Date(now.getTime() - 16 * 60_000), "PENDING_PAYMENT");
      const active = await createBooking(new Date(now.getTime() - 14 * 60_000), "PENDING_PAYMENT");
      const confirmed = await createBooking(new Date(now.getTime() - 30 * 60_000), "SCHEDULED");
      const displayed = await tx.scheduleOccurrence.findMany({ where, select: { id: true } });
      assert.deepEqual(new Set(displayed.filter((item) => [expired.id, active.id, confirmed.id].includes(item.id)).map((item) => item.id)), new Set([active.id, confirmed.id]));
      assert.equal(await tx.scheduleOccurrence.count({ where }), previousCount + 2);
      assert.equal(displayed.some((item) => item.id === expired.id), false);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("aviso de pagamento pendente permanece visível ao consultar outra data", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback do aviso de pagamento pendente");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const playerId = "goal-athlete-a";
      const now = new Date();
      const today = new Date("2035-07-01T00:00:00.000Z");
      const selectedDate = new Date("2035-07-08T00:00:00.000Z");
      const startsAt = new Date("2035-07-02T14:00:00.000Z");
      const booking = await tx.scheduleOccurrence.create({ data: {
        arenaId: arena.id, sourceType: "ONLINE_BOOKING", title: "Pagamento pendente descartável GOAL",
        startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), status: "PENDING_PAYMENT",
        createdAt: new Date(now.getTime() - 2 * 60_000),
        participants: { create: { playerId } },
      }, select: { id: true } });
      assert.ok(startsAt < selectedDate);
      const pending = await tx.scheduleOccurrence.findFirst({
        where: { id: booking.id, ...pendingPlayerOnlineBookingWhere(arena.id, playerId, today, now) },
        select: { id: true },
      });
      assert.equal(pending?.id, booking.id);
      assert.equal(await tx.scheduleOccurrence.findFirst({ where: { id: booking.id, endsAt: { gte: selectedDate } }, select: { id: true } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("portal mantém reserva futura no horário da arena mesmo quando o servidor está em UTC", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback da reserva futura no portal");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const playerId = "goal-athlete-a";
      const now = new Date("2026-10-13T19:00:00.000Z"); // 16h na arena
      const startsAt = new Date(2026, 9, 13, 18); // 18h na arena
      const booking = await tx.scheduleOccurrence.create({ data: {
        arenaId: arena.id, sourceType: "ONLINE_BOOKING", title: "Reserva futura descartável GOAL",
        startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), status: "SCHEDULED",
        participants: { create: { playerId } },
      }, select: { id: true } });
      const found = await tx.scheduleOccurrence.findFirst({ where: { id: booking.id, ...upcomingPlayerReservationsWhere(arena.id, playerId, now) }, select: { id: true } });
      assert.equal(found?.id, booking.id);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
const runtimeUrl = (() => {
  if (!disposableDatabase) return testUrl;
  const url = new URL(testUrl);
  url.username = "arena_runtime";
  url.password = "";
  return url.toString();
})();

test("duas reservas simultâneas da mesma quadra produzem apenas um hold", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const require = createRequire(import.meta.url);
  const source = readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<{ ok: boolean; error?: string; calendarUrl?: string }>> = {};
  const startedAt = new Date();
  const startsAt = new Date("2040-01-02T07:00:00"); // segunda-feira, dentro da regra GOAL 07h–08h
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
  let arenaId = "";
  let courtId = "";
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const court = await admin.court.findFirstOrThrow({ where: { arenaId: arena.id, name: "Quadra GOAL 1" }, select: { id: true } });
    arenaId = arena.id;
    courtId = court.id;
    assert.equal(await isCourtSlotAvailable(admin, arenaId, courtId, startsAt, endsAt), true);
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} },
      zod: require("zod"),
      "@/lib/auth/guards": { requireModuleEdit: async () => { throw new Error("Não usar acesso interno neste teste."); } },
      "@/lib/auth/player-session": { requirePublicPlayerAuth: async () => ({ arenaId, playerId: "goal-athlete-a" }) },
      "@/lib/prisma": { prisma: admin },
      "@/lib/rls": { withArenaTransaction: (scope: string, operation: (tx: any) => Promise<unknown>) => runtime.$transaction(async (tx) => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${scope}, true)`; return operation(tx); }) },
      "@/lib/calendar/inputs": { parseScheduledAt },
      "@/lib/scheduling/weekly-rule": {},
      "@/lib/calendar/booking-types": {},
      "@/lib/calendar/revalidation": { refreshCalendarRoutes() {} },
      "@/lib/calendar/court-interval-pricing": { calculateCourtIntervalPrice, isCourtBookingStartOnGrid },
      "@/lib/calendar/online-booking-hold": { activeCourtOccurrenceWhere, onlineBookingHoldCutoff },
      "@/lib/calendar/arena-wall-clock": { arenaWallClockToInstant },
      "@/lib/calendar/booking-payment-claim": {},
      "@/lib/calendar/court-booking-edit-safety": {},
      "@/lib/integrations/evolution/client": {},
      "@/lib/scheduling/recurrence": {},
      "@/lib/payments/mercado-pago": {},
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Date, FormData, Set, console,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Import inesperado: ${name}`); return mocks[name]; },
    });
    const form = new FormData();
    form.set("arenaSlug", "arena-teste-goal"); form.set("courtId", courtId);
    form.set("startsAt", "2040-01-02T07:00:00"); form.set("durationMinutes", "60");
    const results = await Promise.all([exports.createPublicCourtBookingAction(form), exports.createPublicCourtBookingAction(form)]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.match(results.find((result) => !result.ok)?.error ?? "", /acabou de ser reservado/);
    const occurrences = await admin.scheduleOccurrence.findMany({ where: { arenaId, startsAt, sourceType: "ONLINE_BOOKING", createdAt: { gte: startedAt }, occurrenceCourts: { some: { courtId } } }, select: { id: true } });
    assert.equal(occurrences.length, 1);
  } finally {
    if (arenaId && courtId) {
      const created = await admin.scheduleOccurrence.findMany({ where: { arenaId, startsAt, sourceType: "ONLINE_BOOKING", createdAt: { gte: startedAt }, occurrenceCourts: { some: { courtId } } }, select: { id: true } });
      await admin.scheduleOccurrence.deleteMany({ where: { id: { in: created.map((item) => item.id) } } });
      await admin.arenaNotification.deleteMany({ where: { arenaId, type: "ONLINE_BOOKING", href: "/agenda?data=2040-01-02", createdAt: { gte: startedAt } } });
    }
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("reposições e jogos de Liga liberam o horário após o hold e respeitam a arena", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback da disponibilidade compartilhada");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const startsAt = new Date("2036-03-02T14:00:00.000Z");
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
      const pending = await tx.scheduleOccurrence.create({ data: { arenaId: arenaA.id, sourceType: "ONLINE_BOOKING", title: "Hold descartável", startsAt, endsAt, status: "PENDING_PAYMENT", createdAt: new Date(), occurrenceCourts: { create: { courtId: court.id } } }, select: { id: true } });
      assert.equal(await isCourtSlotAvailable(tx, arenaA.id, court.id, startsAt, endsAt), false);
      await tx.scheduleOccurrence.update({ where: { id: pending.id }, data: { createdAt: new Date(Date.now() - 16 * 60_000) } });
      assert.equal(await isCourtSlotAvailable(tx, arenaA.id, court.id, startsAt, endsAt), true);
      await tx.scheduleOccurrence.create({ data: { arenaId: arenaA.id, sourceType: "LESSON_MAKEUP", title: "Reposição descartável", startsAt, endsAt, status: "SCHEDULED", occurrenceCourts: { create: { courtId: court.id } } } });
      assert.equal(await isCourtSlotAvailable(tx, arenaA.id, court.id, startsAt, endsAt), false);
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await isCourtSlotAvailable(tx, arenaB.id, court.id, startsAt, endsAt), false);
      throw rollback;
    }), (error: unknown) => {
      if (error !== rollback) throw error;
      return true;
    });
  } finally {
    await db.$disconnect();
  }
});

test("bloqueio de pagamento expira no banco e o RLS não revela a reserva para outra arena", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback da reserva de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const now = new Date();
      const startsAt = new Date(now.getTime() + 24 * 60 * 60_000);
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
      const occurrence = await tx.scheduleOccurrence.create({ data: { arenaId: arenaA.id, sourceType: "ONLINE_BOOKING", title: "Reserva descartável GOAL", startsAt, endsAt, status: "PENDING_PAYMENT", createdAt: new Date(now.getTime() - 14 * 60_000), occurrenceCourts: { create: { courtId: court.id } } }, select: { id: true } });
      const where = { arenaId: arenaA.id, ...activeCourtOccurrenceWhere(now), startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId: court.id } } };
      assert.equal((await tx.scheduleOccurrence.findFirst({ where: { ...where, id: occurrence.id }, select: { id: true } }))?.id, occurrence.id);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await tx.scheduleOccurrence.findFirst({ where: { id: occurrence.id }, select: { id: true } }), null);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.scheduleOccurrence.update({ where: { id: occurrence.id }, data: { createdAt: new Date(now.getTime() - 16 * 60_000) } });
      assert.equal(await tx.scheduleOccurrence.findFirst({ where: { ...where, id: occurrence.id }, select: { id: true } }), null);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("pagamento tardio só confirma horário futuro e livre; sinaliza horário ocupado ou iniciado", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback das confirmações de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arena.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const player = await tx.player.findFirstOrThrow({ where: { arenaId: arena.id, id: "goal-athlete-a" }, select: { id: true } });
      const now = new Date();
      const expiredAt = new Date(now.getTime() - 16 * 60_000);
      const freeStartsAt = new Date("2035-06-01T14:00:00.000Z");
      const occupiedStartsAt = new Date("2035-06-08T14:00:00.000Z");
      const createBooking = (startsAt: Date, createdAt: Date) => tx.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "ONLINE_BOOKING", title: "Reserva descartável GOAL", startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), status: "PENDING_PAYMENT", createdAt, occurrenceCourts: { create: { courtId: court.id } }, participants: { create: { playerId: player.id, amountCents: 5000 } } }, select: { id: true } });

      const free = await createBooking(freeStartsAt, expiredAt);
      assert.equal(await finalizePaidCourtBooking(tx, arena.id, free.id), true);
      assert.equal((await tx.scheduleOccurrence.findUniqueOrThrow({ where: { id: free.id }, select: { status: true } })).status, "SCHEDULED");

      const old = await createBooking(occupiedStartsAt, expiredAt);
      await createBooking(occupiedStartsAt, now);
      assert.equal(await finalizePaidCourtBooking(tx, arena.id, old.id), false);
      assert.equal((await tx.scheduleOccurrence.findUniqueOrThrow({ where: { id: old.id }, select: { status: true } })).status, "CANCELED");
      assert.equal(await tx.arenaNotification.count({ where: { arenaId: arena.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 1);
      assert.equal(await tx.playerNotification.count({ where: { playerId: player.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 1);
      const notification = await tx.playerNotification.findFirstOrThrow({ where: { playerId: player.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" }, select: { href: true } });
      assert.match(notification.href, /arena=arena-teste-goal&section=booking/);

      const started = await createBooking(instantToArenaWallClock(new Date(now.getTime() - 2 * 60 * 60_000)), new Date(now.getTime() - 3 * 60 * 60_000));
      assert.equal(await finalizePaidCourtBooking(tx, arena.id, started.id), false);
      assert.equal((await tx.scheduleOccurrence.findUniqueOrThrow({ where: { id: started.id }, select: { status: true } })).status, "CANCELED");
      assert.equal(await tx.arenaNotification.count({ where: { arenaId: arena.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 2);
      assert.equal(await tx.playerNotification.count({ where: { playerId: player.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 2);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("uma reserva só inicia um método de pagamento durante o bloqueio", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback da escolha de pagamento");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arena.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const playerId = "goal-athlete-a";
      await tx.player.update({ where: { id: playerId }, data: { email: "goal-booking@example.test" } });
      const startsAt = new Date("2036-08-01T14:00:00.000Z");
      const booking = await tx.scheduleOccurrence.create({ data: {
        arenaId: arena.id, sourceType: "ONLINE_BOOKING", title: "Escolha descartável GOAL", startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000), status: "PENDING_PAYMENT",
        occurrenceCourts: { create: { courtId: court.id } },
        participants: { create: { playerId, amountCents: 5000 } },
      }, select: { id: true } });
      const input = { arenaId: arena.id, occurrenceId: booking.id, playerId, method: "PIX" as const };
      assert.equal((await claimOnlineBookingPaymentMethod(tx, input))?.id, booking.id);
      assert.equal((await claimOnlineBookingPaymentMethod(tx, input))?.id, booking.id);
      assert.equal((await tx.scheduleParticipant.findFirstOrThrow({ where: { occurrenceId: booking.id, playerId }, select: { paymentMethod: true } })).paymentMethod, "MERCADO_PAGO_PENDING:PIX");
      await assert.rejects(claimOnlineBookingPaymentMethod(tx, { ...input, method: "CARD" }), /Já existe uma cobrança iniciada/);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("pagamento posterior não reativa reserva cancelada pelo atleta", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da reserva cancelada de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arena.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const player = await tx.player.findFirstOrThrow({ where: { arenaId: arena.id, id: "goal-athlete-a" }, select: { id: true } });
      const startsAt = new Date("2035-06-15T14:00:00.000Z");
      const booking = await tx.scheduleOccurrence.create({
        data: {
          arenaId: arena.id,
          sourceType: "ONLINE_BOOKING",
          title: "Reserva cancelada descartável GOAL",
          startsAt,
          endsAt: new Date(startsAt.getTime() + 60 * 60_000),
          status: "CANCELED",
          occurrenceCourts: { create: { courtId: court.id } },
          participants: { create: { playerId: player.id, amountCents: 5000 } },
        },
        select: { id: true },
      });
      assert.equal(await finalizePaidCourtBooking(tx, arena.id, booking.id), false);
      assert.equal((await tx.scheduleOccurrence.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true } })).status, "CANCELED");
      assert.equal(await tx.arenaNotification.count({ where: { arenaId: arena.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});

test("finalização paga não alcança reserva de outra arena", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
  const rollback = new Error("rollback do isolamento da reserva paga");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      const court = await tx.court.findFirstOrThrow({ where: { arenaId: arenaA.id, name: "Quadra GOAL 1" }, select: { id: true } });
      const startsAt = new Date("2035-07-01T14:00:00.000Z");
      const booking = await tx.scheduleOccurrence.create({ data: {
        arenaId: arenaA.id, sourceType: "ONLINE_BOOKING", title: "Reserva isolada descartável GOAL",
        startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), status: "PENDING_PAYMENT",
        occurrenceCourts: { create: { courtId: court.id } },
      }, select: { id: true } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaB.id}, true)`;
      assert.equal(await finalizePaidCourtBooking(tx, arenaB.id, booking.id), false);
      assert.equal(await tx.arenaNotification.count({ where: { arenaId: arenaB.id, type: "ONLINE_BOOKING_PAYMENT_REVIEW" } }), 0);

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      assert.equal((await tx.scheduleOccurrence.findUniqueOrThrow({ where: { id: booking.id }, select: { status: true } })).status, "PENDING_PAYMENT");
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
