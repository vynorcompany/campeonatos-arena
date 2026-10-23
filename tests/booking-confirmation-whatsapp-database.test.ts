import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, type Prisma } from "@prisma/client";
import { bookingConfirmationMessage } from "../src/lib/calendar/booking-confirmation-message";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = (() => { try { const value = new URL(url); return value.hostname === "127.0.0.1" && value.port === "55433" && value.pathname === "/arena_goal"; } catch { return false; } })();
test("WhatsApp usa configuração persistida, respeita desativação e registra falha de envio", { skip: !disposable }, async () => {
 const admin = new PrismaClient({ datasources: { db: { url } } });
 const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
 const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
 let arenaId = ""; const sent: { phone: string; text: string; arenaId: string }[] = []; let reject = false;
 try {
  const owner = await admin.user.findUniqueOrThrow({ where: { id: "goal-test" } });
  const arena = await admin.arena.create({ data: { slug: `whatsapp-test-${randomUUID()}`, name: "Arena teste", createdById: owner.id, onlineBookingWhatsappConfirmationEnabled: false, onlineBookingWhatsappMessage: "Olá, {cliente}. {quadra}, {data} às {horario}, na {arena}." } }); arenaId = arena.id;
  const player = await admin.player.create({ data: { arenaId, name: "Ana", phone: "5500000000011" } });
  const court = await admin.court.create({ data: { arenaId, name: "Quadra 2" } });
  const occurrence = await admin.scheduleOccurrence.create({ data: { arenaId, sourceType: "ONLINE_BOOKING", title: "Reserva teste", startsAt: new Date(2026, 9, 24, 19, 30), endsAt: new Date(2026, 9, 24, 20, 30), status: "SCHEDULED", participants: { create: { playerId: player.id } }, occurrenceCourts: { create: { courtId: court.id } } } });
  const transact = (id: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return operation(tx); });
  const exports: Record<string, (id: string, bookingId: string) => Promise<{ sent: number; failed: number }>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/calendar/booking-confirmation-whatsapp.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Map, Promise, require: (name: string) => name === "@/lib/rls" ? { withArenaTransaction: transact } : name === "./booking-confirmation-message" ? { bookingConfirmationMessage } : { sendEvolutionTextMessage: async (phone: string, text: string, arenaId: string) => { if (reject) throw Error("Provider refused"); sent.push({ phone, text, arenaId }); } } });
  await exports.sendBookingConfirmationForOccurrence(arenaId, occurrence.id); assert.equal(sent.length, 0);
  await admin.arena.update({ where: { id: arenaId }, data: { onlineBookingWhatsappConfirmationEnabled: true } });
  await exports.sendBookingConfirmationForOccurrence(arenaId, occurrence.id);
  assert.deepEqual(sent, [{ phone: player.phone, text: "Olá, Ana. Quadra 2, 24/10/2026 às 19:30, na Arena teste.", arenaId }]);
  reject = true;
  assert.equal((await exports.sendBookingConfirmationForOccurrence(arenaId, occurrence.id)).failed, 1);
  assert.equal(await admin.arenaNotification.count({ where: { arenaId, type: "ONLINE_BOOKING_WHATSAPP_FAILED" } }), 1);
  await admin.scheduleOccurrence.update({ where: { id: occurrence.id }, data: { status: "PENDING_CONFIRMATION" } });
  assert.equal((await exports.sendBookingConfirmationForOccurrence(arenaId, occurrence.id)).failed, 0);
  assert.equal(sent.length, 1);
 } finally { if (arenaId) { await admin.scheduleOccurrence.deleteMany({ where: { arenaId } }); await admin.arena.delete({ where: { id: arenaId } }); } await runtime.$disconnect(); await admin.$disconnect(); }
});
