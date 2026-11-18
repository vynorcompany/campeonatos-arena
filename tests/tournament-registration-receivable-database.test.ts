import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { ensureTournamentRegistrationReceivable, lockTournamentRegistrationEntriesForReceipt } from "../src/lib/tournaments/registration-receivable";
import { releaseExpiredPublicRegistrationHolds } from "../src/lib/tournaments/registration-payment-hold";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("registration debts preserve tenant isolation, cancel expired holds, and backfill only unpaid local registrations once", { skip: !enabled }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenaIds: string[] = [];
  const scope = <T>(arenaId: string, callback: (tx: any) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return callback(tx); });
  try {
    for (let i = 0; i < 2; i++) arenaIds.push((await db.arena.create({ data: { name: "Receivables QA", slug: "receivables-" + randomUUID(), createdById: "goal-test" } })).id);
    const event = await db.tournament.create({ data: { arenaId: arenaIds[0], name: "Event QA" } });
    const category = await db.tournamentCategory.create({ data: { tournamentId: event.id, name: "Individual", level: 1, registrationType: "INDIVIDUAL" } });
    let order = 0;
    const registration = (data: Record<string, any> = {}) => db.publicTournamentRegistration.create({ data: { tournamentId: event.id, categoryId: category.id, registrationOrder: ++order, leadName: "Local QA " + order, leadPhone: "4299999" + String(order).padStart(4, "0"), leadCpf: "", partnerName: "", partnerPhone: "", partnerCpf: "", amountCents: 7500, paymentProvider: "PAY_ON_SITE", paymentStatus: "PENDING", status: "CONFIRMED", ...data } });
    const local = await registration();
    const entries = await Promise.all([scope(arenaIds[0], tx => ensureTournamentRegistrationReceivable(tx, arenaIds[0], local.id)), scope(arenaIds[0], tx => ensureTournamentRegistrationReceivable(tx, arenaIds[0], local.id))]);
    assert.equal(entries[0]?.id, entries[1]?.id); assert.equal(entries[0]?.status, "PENDING");
    await assert.rejects(scope(arenaIds[1], tx => ensureTournamentRegistrationReceivable(tx, arenaIds[1], local.id)), /não encontrada/);
    const online = await registration({ paymentProvider: "MERCADO_PAGO", status: "PENDING_PAYMENT", holdExpiresAt: new Date(Date.now() - 1000) });
    const debt = await scope(arenaIds[0], tx => ensureTournamentRegistrationReceivable(tx, arenaIds[0], online.id)); assert.ok(debt);
    await assert.rejects(scope(arenaIds[0], tx => lockTournamentRegistrationEntriesForReceipt(tx, arenaIds[0], [debt.id])), /cobrança online/);
    await scope(arenaIds[0], tx => releaseExpiredPublicRegistrationHolds(tx, event.id));
    assert.equal((await db.financialEntry.findUniqueOrThrow({ where: { id: debt.id } })).status, "VOIDED");
    const legacy = await registration();
    const paid = await registration({ paymentStatus: "PAID" });
    const canceled = await registration({ status: "CANCELED" });
    const review = await registration({ paymentStatus: "REVIEW" });
    const free = await registration({ amountCents: 0 });
    const migration = readFileSync(new URL("../prisma/migrations/20261118143000_event_registration_receivables/migration.sql", import.meta.url), "utf8");
    // Restrict the unchanged migration body to this disposable fixture; other tests run concurrently.
    const fixtureMigration = migration.replace('WHERE r."amountCents" > 0', `WHERE r."tournamentId" = '${event.id}' AND r."amountCents" > 0`);
    for (let i = 0; i < 2; i++) await db.$executeRawUnsafe(fixtureMigration);
    const original = await db.financialEntry.findMany({ where: { arenaId: arenaIds[0], externalReference: local.id } }); assert.equal(original.length, 1); assert.equal(original[0].id, entries[0]?.id);
    const backfilled = await db.financialEntry.findMany({ where: { arenaId: arenaIds[0], externalReference: legacy.id }, include: { settlements: true } }); assert.equal(backfilled.length, 1); assert.equal(backfilled[0].status, "PENDING"); assert.equal(backfilled[0].amountCents, 7500); assert.equal(backfilled[0].settlements.length, 0);
    assert.equal(await db.financialEntry.count({ where: { arenaId: arenaIds[0], externalReference: { in: [paid.id, canceled.id, review.id, free.id] } } }), 0);
  } finally {
    await db.arena.deleteMany({ where: { id: { in: arenaIds } } }); await runtime.$disconnect(); await db.$disconnect();
  }
});
