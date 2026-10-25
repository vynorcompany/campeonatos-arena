import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { createPrivacyRequest, eraseOptionalProfile, exportPrivateProfile } from "../src/lib/legal/privacy-service";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("privacy requests and immediate removal are isolated, concurrent-safe and preserve financial records", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  try {
    for (const label of ["A", "B"]) arenas.push((await admin.arena.create({ data: { name: `Privacy ${label}`, slug: `privacy-${randomUUID()}`, createdById: "goal-test" } })).id);
    const players = await Promise.all(arenas.map(arenaId => admin.player.create({ data: { arenaId, name: "Privacy Person", phone: "11988887777", bio: "private bio", email: "private@example.test", cpf: "11111111111", photoUrl: "private-photo", birthDate: new Date("1990-01-01"), class: "4", padelSide: "LEFT", padelCategories: '["4"]', tournamentAvailability: "ON" } })));
    const owner = { arenaId: arenas[0], playerId: players[0].id };
    await admin.playerAccount.create({ data: { ...owner, phone: "11988887777", passwordHash: "never-export-password-hash" } });
    const entry = await admin.financialEntry.create({ data: { ...owner, type: "REVENUE", category: "QA", description: "Preserved debt", amountCents: 1000 } });
    const scoped = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenas[0]}, true)`; return fn(tx); });
    const results = await Promise.all([scoped(tx => createPrivacyRequest(tx, owner, "ERASURE", "Remove my data")), scoped(tx => createPrivacyRequest(tx, owner, "ERASURE", "Repeated request"))]);
    assert.equal(results[0].id, results[1].id);
    assert.equal(await admin.privacyRequest.count({ where: owner }), 1);
    assert.equal(await admin.arenaNotification.count({ where: { arenaId: owner.arenaId, type: "PRIVACY_REQUEST" } }), 1);
    assert.deepEqual(await runtime.privacyRequest.findMany({ where: { arenaId: { in: arenas } } }), []);
    await assert.rejects(scoped(tx => createPrivacyRequest(tx, { arenaId: arenas[0], playerId: players[1].id }, "ACCESS", "Foreign")), /Cadastro não encontrado/);
    await assert.rejects(scoped(tx => tx.privacyRequest.create({ data: { arenaId: arenas[0], playerId: players[1].id, kind: "ACCESS" } })));
    const exported = await scoped(tx => exportPrivateProfile(tx, owner));
    const text = JSON.stringify(exported);
    assert.equal(exported.profile.name, players[0].name);
    assert.equal(exported.profile.cpf, "11111111111");
    assert.equal(text.includes("passwordHash"), false);
    assert.equal(text.includes("never-export-password-hash"), false);
    assert.equal(text.includes(players[1].id), false);
    await scoped(tx => eraseOptionalProfile(tx, owner));
    const erased = await admin.player.findUniqueOrThrow({ where: { id: owner.playerId } });
    assert.equal(erased.photoUrl, ""); assert.equal(erased.bio, ""); assert.equal(erased.birthDate, null);
    assert.equal(erased.padelCategories, "[]"); assert.equal(erased.class, ""); assert.equal(erased.tournamentAvailability, "OFF");
    assert.equal(erased.name, "Privacy Person"); assert.equal(erased.phone, "11988887777"); assert.equal(erased.active, true);
    assert.equal((await admin.player.findUniqueOrThrow({ where: { id: players[1].id } })).bio, "private bio");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: entry.id } })).amountCents, 1000);
    assert.equal(await admin.playerAccount.count({ where: owner }), 1);
    assert.equal(await admin.auditEvent.count({ where: { arenaId: owner.arenaId, action: "OPTIONAL_PROFILE_ERASED" } }), 1);
  } finally {
    await admin.privacyRequest.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
