import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { boletoCancellationDisposition } from "../src/lib/payments/boleto-cancellation";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("cancelar reserva respeita a escolha sobre cobranças abertas sem afetar valores pagos ou outra arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const occurrenceIds: string[] = [];
  const entryIds: string[] = [];
  const settlementIds: string[] = [];
  const canceledPaymentIds: string[] = [];
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    const require = createRequire(import.meta.url);
    const source = readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} },
      zod: require("zod"),
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arenaA.id }) },
      "@/lib/auth/player-session": {},
      "@/lib/prisma": { prisma: admin },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }) },
      "@/lib/calendar/inputs": {},
      "@/lib/scheduling/weekly-rule": {},
      "@/lib/calendar/booking-types": {},
      "@/lib/calendar/revalidation": { refreshCalendarRoutes() {} },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
      "@/lib/calendar/court-interval-pricing": {},
      "@/lib/calendar/online-booking-hold": {},
      "@/lib/calendar/court-booking-edit-safety": {},
      "@/lib/calendar/arena-wall-clock": {},
      "@/lib/calendar/booking-payment-claim": {},
      "@/lib/calendar/booking-delinquency": {},
      "@/lib/integrations/evolution/client": {},
      "@/lib/scheduling/recurrence": {},
      "@/lib/payments/mercado-pago": {
        getMercadoPagoPayment: async (_arenaId: string, paymentId: string) => ({ status: paymentId === "goal-payment-pending" ? "pending" : "approved" }),
        cancelMercadoPagoPayment: async (_arenaId: string, paymentId: string) => { canceledPaymentIds.push(paymentId); },
      },
      "@/lib/payments/boleto-cancellation": { boletoCancellationDisposition },
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Date, FormData, Set, console,
      require: (name: string) => { if (!(name in mocks)) throw new Error(`Import inesperado: ${name}`); return mocks[name]; },
    });
    const createOccurrence = async (arenaId: string) => {
      const occurrence = await admin.scheduleOccurrence.create({ data: {
        arenaId, sourceType: "BOOKING", title: "Reserva descartável GOAL", status: "SCHEDULED",
        startsAt: new Date("2038-04-10T14:00:00Z"), endsAt: new Date("2038-04-10T15:00:00Z"),
      }, select: { id: true } });
      occurrenceIds.push(occurrence.id);
      return occurrence.id;
    };
    const createEntry = async (arenaId: string, occurrenceId: string, status: "PENDING" | "PAID") => {
      const entry = await admin.financialEntry.create({ data: {
        arenaId, type: "REVENUE", category: "Reserva", description: "Cobrança descartável GOAL",
        amountCents: 5000, source: "SCHEDULE_BOOKING", externalReference: occurrenceId, status,
      }, select: { id: true } });
      entryIds.push(entry.id);
      return entry.id;
    };
    const cancel = (occurrenceId: string, cancelOpenCharges: "yes" | "no") => {
      const form = new FormData();
      form.set("occurrenceId", occurrenceId);
      form.set("mode", "CANCEL");
      form.set("cancelOpenCharges", cancelOpenCharges);
      return exports.cancelCourtBookingAction(form);
    };

    const keptOccurrence = await createOccurrence(arenaA.id);
    const keptEntry = await createEntry(arenaA.id, keptOccurrence, "PENDING");
    await cancel(keptOccurrence, "no");
    assert.equal((await admin.scheduleOccurrence.findUniqueOrThrow({ where: { id: keptOccurrence } })).status, "CANCELED");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: keptEntry } })).status, "PENDING");

    const voidedOccurrence = await createOccurrence(arenaA.id);
    const voidedEntry = await createEntry(arenaA.id, voidedOccurrence, "PENDING");
    const paidEntry = await createEntry(arenaA.id, voidedOccurrence, "PAID");
    const partialEntry = await createEntry(arenaA.id, voidedOccurrence, "PENDING");
    const settlement = await admin.financialSettlement.create({ data: { arenaId: arenaA.id, financialEntryId: partialEntry, amountCents: 1000, paymentMethod: "PIX" }, select: { id: true } });
    settlementIds.push(settlement.id);
    const onlinePendingEntry = await createEntry(arenaA.id, voidedOccurrence, "PENDING");
    await admin.financialEntry.update({ where: { id: onlinePendingEntry }, data: { onlineProvider: "MERCADO_PAGO", onlinePaymentId: "goal-payment-pending" } });
    const onlineApprovedEntry = await createEntry(arenaA.id, voidedOccurrence, "PENDING");
    await admin.financialEntry.update({ where: { id: onlineApprovedEntry }, data: { onlineProvider: "MERCADO_PAGO", onlinePaymentId: "goal-payment-approved" } });
    await cancel(voidedOccurrence, "yes");
    assert.equal((await admin.scheduleOccurrence.findUniqueOrThrow({ where: { id: voidedOccurrence } })).status, "CANCELED");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: voidedEntry } })).status, "VOIDED");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: paidEntry } })).status, "PAID");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: partialEntry } })).status, "PENDING");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: onlinePendingEntry } })).status, "VOIDED");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: onlineApprovedEntry } })).status, "PENDING");
    assert.deepEqual(canceledPaymentIds, ["goal-payment-pending"]);

    const otherOccurrence = await createOccurrence(arenaB.id);
    const otherEntry = await createEntry(arenaB.id, otherOccurrence, "PENDING");
    await assert.rejects(cancel(otherOccurrence, "yes"), /não foi encontrado/);
    assert.equal((await admin.scheduleOccurrence.findUniqueOrThrow({ where: { id: otherOccurrence } })).status, "SCHEDULED");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: otherEntry } })).status, "PENDING");
  } finally {
    if (settlementIds.length) await admin.financialSettlement.deleteMany({ where: { id: { in: settlementIds } } });
    if (entryIds.length) await admin.financialEntry.deleteMany({ where: { id: { in: entryIds } } });
    if (occurrenceIds.length) await admin.scheduleOccurrence.deleteMany({ where: { id: { in: occurrenceIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
