import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";

test("sidebar counts only the connected account and clears when the session is reset", async () => {
  let connection: { status: string; connectedPhone: string } | null = { status: "CONNECTED", connectedPhone: "5511000000001:7@c.us" };
  const conversations = [
    { arenaId: "arena", accountJid: "5511000000001@s.whatsapp.net", unreadCount: 30 },
    { arenaId: "arena", accountJid: "5511000000002@s.whatsapp.net", unreadCount: 4 },
    { arenaId: "other", accountJid: "5511000000002@s.whatsapp.net", unreadCount: 90 },
    { arenaId: "arena", accountJid: "", unreadCount: 15 },
  ];
  let queries = 0;
  const prisma = {
    whatsAppConnection: { findUnique: async () => connection },
    whatsAppConversation: { aggregate: async ({ where }: { where: { arenaId: string; accountJid: string } }) => {
      queries++;
      const rows = conversations.filter((row) => row.arenaId === where.arenaId && row.accountJid === where.accountJid);
      return { _sum: { unreadCount: rows.length ? rows.reduce((sum, row) => sum + row.unreadCount, 0) : null } };
    } },
  };
  const source = readFileSync(new URL("../src/lib/whatsapp-active-account.ts", import.meta.url), "utf8");
  const exports: { getActiveWhatsAppUnreadCount?: (arena: string) => Promise<number> } = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/whatsapp-account") return { normalizeWhatsAppAccountJid };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const count = exports.getActiveWhatsAppUnreadCount!;
  assert.equal(await count("arena"), 30);
  connection = { status: "CONNECTED", connectedPhone: "5511000000002@s.whatsapp.net" };
  assert.equal(await count("arena"), 4);
  conversations[1].unreadCount = 0;
  assert.equal(await count("arena"), 0);
  connection = { status: "CONNECTED", connectedPhone: "5511000000003@s.whatsapp.net" };
  assert.equal(await count("arena"), 0);
  const queriesBeforeDisconnect = queries;
  for (const status of ["AWAITING_SCAN", "DISCONNECTED"]) {
    connection = { status, connectedPhone: "5511000000001@s.whatsapp.net" };
    assert.equal(await count("arena"), 0);
  }
  connection = { status: "CONNECTED", connectedPhone: "" };
  assert.equal(await count("arena"), 0);
  connection = null;
  assert.equal(await count("arena"), 0);
  assert.equal(queries, queriesBeforeDisconnect);
  assert.equal(conversations[0].unreadCount, 30);
});

test("live sidebar pulse returns unread totals for the active arena and account, including zero after reset", async () => {
  let accountJid = "account-a";
  const rows = [
    { arenaId: "arena", accountJid: "account-a", unreadCount: 2 },
    { arenaId: "arena", accountJid: "account-a", unreadCount: 3 },
    { arenaId: "arena", accountJid: "account-b", unreadCount: 30 },
    { arenaId: "other", accountJid: "account-a", unreadCount: 90 },
  ];
  let queries = 0;
  const prisma = { whatsAppConversation: {
    findFirst: async ({ where }: any) => { queries++; assert.deepEqual({ ...where }, { arenaId: "arena", accountJid }); return { id: "latest", updatedAt: new Date(1000) }; },
    aggregate: async ({ where }: any) => ({ _sum: { unreadCount: rows.filter(row => row.arenaId === where.arenaId && row.accountJid === where.accountJid).reduce((sum, row) => sum + row.unreadCount, 0) } }),
  } };
  const source = readFileSync(new URL("../src/app/api/whatsapp/pulse/route.ts", import.meta.url), "utf8");
  const exports: { GET?: () => Promise<{ data: any; headers: any }> } = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: (name: string) => {
    if (name === "next/server") return { NextResponse: { json: (data: any, options: any) => ({ data, headers: options.headers }) } };
    if (name === "@/lib/auth/guards") return { requireModuleView: async (module: string) => { assert.equal(module, "support"); return { arenaId: "arena" }; } };
    if (name === "@/lib/prisma") return { prisma };
    if (name === "@/lib/whatsapp-active-account") return { getActiveWhatsAppAccountJid: async () => accountJid };
    throw new Error(`Unexpected import: ${name}`);
  } });
  let result = await exports.GET!();
  assert.equal(result.data.unreadCount, 5);
  assert.match(result.headers["cache-control"], /no-store/);
  rows[0].unreadCount++;
  assert.equal((await exports.GET!()).data.unreadCount, 6);
  rows[0].unreadCount = rows[1].unreadCount = 0;
  assert.equal((await exports.GET!()).data.unreadCount, 0);
  accountJid = "account-b";
  result = await exports.GET!();
  assert.equal(result.data.unreadCount, 30);
  assert.match(result.data.version, /^account-b:/);
  accountJid = "";
  const before = queries;
  assert.equal((await exports.GET!()).data.unreadCount, 0);
  assert.equal(queries, before);
});
