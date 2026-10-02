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
