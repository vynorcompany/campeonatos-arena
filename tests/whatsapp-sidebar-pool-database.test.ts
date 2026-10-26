import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = (() => { try { const u = new URL(url); return u.hostname === "127.0.0.1" && u.port === "55433" && u.pathname === "/arena_goal" && u.username === "postgres"; } catch { return false; } })();

test("sidebar reads wait for the busy pool and preserve account/arena isolation", { skip: !enabled }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime"; runtimeUrl.searchParams.set("connection_limit", "1");
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = []; let ownerId = "";
  let release!: () => void; let blocker: Promise<unknown> | undefined;
  try {
    ownerId = (await admin.user.create({ data: { email: `sidebar-pool-${randomUUID()}@example.test`, name: "QA fila da barra lateral", passwordHash: "test-only" } })).id;
    for (let i = 0; i < 2; i++) arenas.push((await admin.arena.create({ data: { createdById: ownerId, name: "QA fila da barra lateral", slug: `sidebar-pool-${randomUUID()}` } })).id);
    const accountJid = "5511000000001@s.whatsapp.net";
    await admin.whatsAppConnection.create({ data: { arenaId: arenas[0], instanceName: `pool-${randomUUID()}`, status: "CONNECTED", connectedPhone: "5511000000001:7@c.us" } });
    await admin.whatsAppConversation.createMany({ data: [
      { arenaId: arenas[0], accountJid, remoteJid: "contact-a@s.whatsapp.net", unreadCount: 7 },
      { arenaId: arenas[0], accountJid: "old-account@s.whatsapp.net", remoteJid: "contact-b@s.whatsapp.net", unreadCount: 200 },
      { arenaId: arenas[1], accountJid, remoteJid: "contact-c@s.whatsapp.net", unreadCount: 800 },
    ] });
    const source = readFileSync(new URL("../src/lib/whatsapp-active-account.ts", import.meta.url), "utf8");
    const exports: { getActiveWhatsAppUnreadCount?: (arena: string) => Promise<number>; getActiveWhatsAppAccountJid?: (arena: string) => Promise<string> } = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/arena-database") return { arenaDatabase: (id: string) => arenaDatabaseForTest(runtime, id) };
      if (name === "@/lib/whatsapp-account") return { normalizeWhatsAppAccountJid };
      throw new Error(`Unexpected dependency: ${name}`);
    } });
    let acquired!: () => void;
    const ready = new Promise<void>(resolve => { acquired = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    blocker = runtime.$transaction(async tx => { await tx.$queryRaw`SELECT 1`; acquired(); await hold; }, { timeout: 10000 });
    await ready;
    let settled = 0;
    const capture = <T,>(promise: Promise<T>) => promise.then(value => { settled++; return { value }; }, error => { settled++; return { error }; });
    const pending = [capture(exports.getActiveWhatsAppUnreadCount!(arenas[0])), capture(exports.getActiveWhatsAppAccountJid!(arenas[0]))];
    await new Promise(resolve => setTimeout(resolve, 2500));
    assert.equal(settled, 0, "sidebar queries should wait for the connection instead of failing after two seconds");
    release(); await blocker;
    const results = await Promise.all(pending);
    assert.deepEqual(results, [{ value: 7 }, { value: accountJid }]);
    assert.equal(await runtime.whatsAppConversation.count(), 0, "transaction-local scope must not leak to later unscoped reads");
  } finally {
    release?.(); await blocker?.catch(() => {});
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect();
    if (ownerId) await admin.user.delete({ where: { id: ownerId } });
    await admin.$disconnect();
  }
});
