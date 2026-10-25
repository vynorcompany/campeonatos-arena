import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { Prisma, PrismaClient } from "@prisma/client";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);

test("expiry claims coordinate workers, preserve money, and isolate arenas and athlete filters", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  const now = new Date();
  const past = new Date(now.getTime() - 60_000);
  const calls: Array<{ arenaId: string; checkoutId: string }> = [];
  const outcomes = new Map<string, "expired" | "review" | "failed">();
  let gate: Promise<void> | undefined;
  let started: (() => void) | undefined;
  try {
    for (const label of ["A", "B"]) ids.push((await admin.arena.create({ data: { name: `Expiry QA ${label}`, slug: `expiry-qa-${randomUUID()}`, createdById: "goal-test" } })).id);
    const a = await admin.player.create({ data: { arenaId: ids[0], name: "Own athlete" } });
    const otherPlayer = await admin.player.create({ data: { arenaId: ids[0], name: "Other athlete" } });
    const b = await admin.player.create({ data: { arenaId: ids[1], name: "Other arena" } });
    const create = async (arenaId: string, playerId: string, expiresAt: Date | null, outcome: "expired" | "review" | "failed" = "expired") => {
      const entry = await admin.financialEntry.create({ data: { arenaId, playerId, type: "REVENUE", category: "QA", description: "Synthetic expiry charge", amountCents: 1500 } });
      const checkout = await admin.onlinePaymentCheckout.create({ data: { arenaId, playerId, amountCents: 1500, expiresAt, mercadoPagoPreferenceId: "fixture-preference", checkoutUrl: "https://checkout.example.test/qa", items: { create: { financialEntryId: entry.id, amountCents: 1500 } } } });
      outcomes.set(checkout.id, outcome);
      return { ...checkout, entryId: entry.id };
    };
    const own = await create(ids[0], a.id, past);
    const foreignPlayer = await create(ids[0], otherPlayer.id, past);
    const foreignArena = await create(ids[1], b.id, past);
    const future = await create(ids[0], a.id, new Date(now.getTime() + 60_000));
    const disabled = await create(ids[0], a.id, null);
    const uncertain = await create(ids[0], a.id, past, "failed");
    const approved = await create(ids[0], a.id, past, "review");
    const exports: any = {};
    const withArenaTransaction = (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
      return operation(tx);
    });
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/payments/portal-checkout-expiry.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, Date,
      require: (name: string) => {
        if (name === "@/lib/prisma") return { prisma: runtime };
        if (name === "@/lib/rls") return { withArenaTransaction };
        if (name === "@/lib/payments/mercado-pago-checkout-expiry") return { expireMercadoPagoCheckout: async (input: { arenaId: string; checkoutId: string }) => {
          calls.push(input); started?.(); if (gate) await gate;
          const kind = outcomes.get(input.checkoutId);
          if (kind === "failed") throw new Error("Provider timeout");
          return { kind, paymentIds: kind === "review" ? ["123"] : [], reviewPaymentIds: kind === "review" ? ["123"] : [] };
        } };
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    let release!: () => void;
    gate = new Promise<void>(resolve => { release = resolve; });
    const providerStarted = new Promise<void>(resolve => { started = resolve; });
    const filter = { playerId: a.id, entryIds: [own.entryId] };
    const first = exports.expirePortalCheckoutsForArena(ids[0], filter, now);
    await providerStarted;
    const concurrent = await exports.expirePortalCheckoutsForArena(ids[0], filter, now);
    assert.equal(concurrent.expired, 0);
    assert.equal(calls.length, 1);
    release(); gate = undefined; started = undefined;
    assert.equal((await first).expired, 1);
    const result = await exports.expirePortalCheckoutsForArena(ids[0], { playerId: a.id }, now);
    assert.equal(result.expired, 0); assert.equal(result.review, 1); assert.equal(result.failed, 1);
    const status = async (id: string) => (await admin.onlinePaymentCheckout.findUniqueOrThrow({ where: { id } })).status;
    assert.equal(await status(own.id), "EXPIRED");
    assert.equal(await status(approved.id), "REVIEW");
    for (const checkout of [foreignPlayer, foreignArena, future, disabled, uncertain]) assert.equal(await status(checkout.id), "PENDING");
    assert.ok(calls.every(call => call.arenaId === ids[0]));
    assert.equal(await admin.financialSettlement.count({ where: { arenaId: { in: ids } } }), 0);
    assert.equal(await admin.financialEntry.count({ where: { arenaId: { in: ids }, status: "PENDING", amountCents: 1500 } }), 7);
    assert.equal(await admin.arenaNotification.count({ where: { arenaId: ids[0], type: "ONLINE_PAYMENT_REVIEW" } }), 1);
    assert.equal(await admin.arenaNotification.count({ where: { arenaId: ids[1] } }), 0);
    const callsBefore = calls.length;
    await exports.expirePortalCheckoutsForArena(ids[0], { playerId: a.id }, now);
    assert.equal(calls.length, callsBefore, "Failed provider calls must respect the backoff");
    outcomes.set(uncertain.id, "expired");
    const retried = await exports.expirePortalCheckoutsForArena(ids[0], { playerId: a.id, entryIds: [uncertain.entryId] }, new Date(now.getTime() + 121_000));
    assert.equal(retried.expired, 1);
    assert.equal(await status(uncertain.id), "EXPIRED");
    const delayed = await create(ids[0], a.id, new Date(now.getTime() - 6 * 60_000), "failed");
    await exports.expirePortalCheckoutsForArena(ids[0], { playerId: a.id, entryIds: [delayed.entryId] }, new Date(now.getTime() - 5 * 60_000));
    const lease = (await admin.onlinePaymentCheckout.findUniqueOrThrow({ where: { id: delayed.id } })).expiryCheckClaimedAt;
    assert.ok(lease && lease >= now, "A delayed batch must start a fresh lease for each checkout");
  } finally {
    await admin.arena.deleteMany({ where: { id: { in: ids } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
