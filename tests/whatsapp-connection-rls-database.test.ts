import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";
import { legalVersion } from "../src/lib/legal/version";

const require = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

test("WhatsApp routing reveals only tenant metadata and callbacks cannot authenticate another arena", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const ids: string[] = [];
  try {
    for (const label of ["A", "B", "C"]) ids.push((await admin.arena.create({ data: { name: `WhatsApp RLS ${label}`, slug: `whatsapp-rls-${randomUUID()}`, createdById: "goal-test" } })).id);
    const secrets = [randomUUID(), randomUUID()];
    const connections = await Promise.all(ids.slice(0, 2).map((arenaId, index) => admin.whatsAppConnection.create({ data: { arenaId, instanceName: `whatsapp-rls-${randomUUID()}`, encryptedToken: "opaque-encrypted-fixture", webhookSecretHash: hash(secrets[index]), status: "CONNECTED", connectedPhone: "5511999990000@s.whatsapp.net", updatedAt: new Date(2030, 0, index + 1) } })));
    const db = arenaDatabaseForTest(runtime, ids[0]);
    assert.deepEqual(await runtime.whatsAppConnection.findMany({ where: { arenaId: { in: ids } } }), []);
    assert.equal(await db.whatsAppConnection.findUnique({ where: { arenaId: ids[1] } }), null);
    await assert.rejects(db.whatsAppConnection.create({ data: { arenaId: ids[2], instanceName: `cross-${randomUUID()}` } }));
    const route = await runtime.$queryRaw<Array<{ arenaId: string | null }>>`SELECT public.resolve_whatsapp_arena(${connections[1].instanceName}) AS "arenaId"`;
    assert.deepEqual(route, [{ arenaId: ids[1] }]);
    assert.deepEqual(await runtime.$queryRaw`SELECT public.resolve_whatsapp_arena(${"unknown'; DROP TABLE ignored; --"}) AS "arenaId"`, [{ arenaId: null }]);
    let outboundRequests = 0;
    const mocks: Record<string, unknown> = {
      "next/server": { NextResponse: { json: (body: unknown, options?: { status?: number }) => ({ status: options?.status ?? 200, body }) } },
      "@/lib/prisma": { prisma: runtime },
      "@/lib/arena-database": { arenaDatabase: (arenaId: string) => arenaDatabaseForTest(runtime, arenaId) },
      "@/lib/payments/connection-secrets": { hashWebhookSecret: hash },
      "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
      "@/lib/integrations/evolution/client": { getEvolutionGroupName: async () => { outboundRequests++; }, getEvolutionProfilePicture: async () => { outboundRequests++; } },
      "@/lib/integrations/evolution/agency": { findEvolutionInstance: async () => { outboundRequests++; } },
      "@/lib/services/whatsapp-conversation": {}, "@/lib/whatsapp-conversation-version": {}, "@/lib/integrations/evolution/groups": {}, "@/lib/rls": {},
    };
    const actions: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/api/integrations/evolution/webhook/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, Date, Buffer, require: (name: string) => name in mocks ? mocks[name] : require(name) });
    const request = (index: number, secret: string, payloadIndex = index) => ({ nextUrl: { searchParams: new URLSearchParams({ instance: connections[index].instanceName }) }, headers: new Headers({ "x-evolution-webhook-secret": secret }), json: async () => ({ instance: connections[payloadIndex].instanceName, event: "CONNECTION_UPDATE", data: { state: "close" } }) });
    assert.equal((await actions.POST(request(1, secrets[0]))).status, 401);
    assert.equal((await actions.POST(request(0, secrets[0], 1))).status, 401);
    assert.equal((await admin.whatsAppConnection.findUniqueOrThrow({ where: { arenaId: ids[1] } })).status, "CONNECTED");
    assert.equal((await actions.POST(request(0, secrets[0]))).status, 200);
    assert.equal((await admin.whatsAppConnection.findUniqueOrThrow({ where: { arenaId: ids[0] } })).status, "DISCONNECTED");
    assert.equal((await admin.whatsAppConnection.findUniqueOrThrow({ where: { arenaId: ids[1] } })).status, "CONNECTED");
    assert.equal(outboundRequests, 0);
    // Password recovery selects a connection only from the user's linked arenas.
    await admin.whatsAppConnection.update({ where: { arenaId: ids[0] }, data: { status: "CONNECTED" } });
    await admin.whatsAppConnection.create({ data: { arenaId: ids[2], instanceName: `unlinked-${randomUUID()}`, status: "CONNECTED", updatedAt: new Date(2030, 0, 10) } });
    const phone = `119${String(Date.now()).slice(-8)}`;
    for (const arenaId of ids.slice(0, 2)) {
      const player = await admin.player.create({ data: { arenaId, name: "Password recovery QA", phone } });
      await admin.playerAccount.create({ data: { arenaId, playerId: player.id, phone, passwordHash: "fixture-only" } });
    }
    const sent: Array<{ phone: string; arenaId: string }> = [];
    const authMocks: Record<string, unknown> = {
      "@/lib/legal/version": { legalVersion }, "next/navigation": {}, "@/lib/auth/player-session": {}, "@/lib/prisma": { prisma: runtime },
      "@/lib/services/public-client-registration": {}, "@/lib/env": { env: {} }, "@/lib/auth/login-attempts": {}, "@/lib/phone": { normalizeBrazilianPhone: (value: string) => value.replace(/\D/g, "") },
      "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: async (target: string, _message: string, arenaId: string) => { sent.push({ phone: target, arenaId }); } },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); }) },
    };
    const authActions: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/player-auth.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { exports: authActions, Date, Buffer, FormData, require: (name: string) => name in authMocks ? authMocks[name] : require(name) });
    const form = new FormData(); form.set("phone", phone);
    assert.equal((await authActions.requestGlobalPublicPasswordResetAction({}, form)).requested, true);
    assert.deepEqual(sent, [{ phone, arenaId: ids[1] }]);
    assert.equal(await admin.playerVerificationCode.count({ where: { arenaId: ids[1], phone, purpose: "RESET" } }), 1);
    assert.equal(await admin.playerVerificationCode.count({ where: { arenaId: ids[2], phone } }), 0);
  } finally {
    await admin.arena.deleteMany({ where: { id: { in: ids } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
