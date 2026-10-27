import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { readEvolutionContacts } from "../src/lib/integrations/evolution/contacts";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";
import { arenaDatabaseForTest } from "./helpers/arena-database";

function load(path: string, mocks: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, ...globals,
    require: (name: string) => { if (name in mocks) return mocks[name]; throw new Error(`Unexpected dependency ${name}`); },
  });
  return exports;
}

test("contact directory requires an identified personal JID and never uses the envelope or a LID as a telephone", () => {
  const contacts = readEvolutionContacts({ name: "Arena Samas", data: [
    { remoteJid: "5511999991111@s.whatsapp.net", pushName: "Cliente A" },
    { id: "5511999992222@c.us", name: "Nome salvo", pushName: "Nome público" },
    { remoteJid: "123456789012@lid", pushName: "LID sem telefone" },
    { remoteJid: "120363000000@g.us", pushName: "Grupo" },
    { id: "not-a-contact", name: "Arena Samas" },
    { remoteJid: "5511888888888@s.whatsapp.net", pushName: "+55 (11) 88888-8888" },
  ] });
  assert.deepEqual(contacts.map(contact => [contact.remoteJid, contact.name]), [["5511999991111@s.whatsapp.net", "Cliente A"], ["5511999992222@s.whatsapp.net", "Nome salvo"]]);
  assert.deepEqual(readEvolutionContacts({ name: "Arena Samas" }), []);
});

test("provider contact lookup uses only the requested arena account, paginates and removes self", async () => {
  const requests: any[] = [];
  let status = "CONNECTED";
  const client = load("../src/lib/integrations/evolution/contact-directory.ts", {
    "server-only": {}, "@/lib/env": { env: { evolutionApiUrl: "https://provider.invalid/", evolutionApiKey: "fixture" } },
    "@/lib/arena-database": { arenaDatabase: (id: string) => { assert.equal(id, "arena-a"); return { whatsAppConnection: { findUnique: async () => ({ instanceName: "arena-a-only", connectedPhone: "5511999990000@s.whatsapp.net", status }) } }; } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid }, "./contacts": { readEvolutionContacts },
  }, { AbortSignal, fetch: async (url: string, options: any) => {
    const body = JSON.parse(options.body); requests.push({ url, body });
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => body.page === 1 ? Array.from({ length: 500 }, (_, index) => ({ remoteJid: `551199999${String(index).padStart(4, "0")}@s.whatsapp.net`, pushName: `Contato ${index}` })) : [{ remoteJid: "5511888888888@s.whatsapp.net", pushName: "Último contato" }] };
  } });
  const result = await client.getEvolutionContacts("arena-a", "5511999990000@s.whatsapp.net");
  assert.equal(result.contacts.length, 500);
  assert.equal(result.truncated, false);
  assert.ok(result.contacts.every((contact: any) => contact.remoteJid !== "5511999990000@s.whatsapp.net"));
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.url === "https://provider.invalid/chat/findContacts/arena-a-only"));
  assert.deepEqual(requests.map(request => request.body.page), [1, 2]);
  status = "DISCONNECTED";
  await assert.rejects(client.getEvolutionContacts("arena-a", "5511999990000@s.whatsapp.net"), /conta.*mudou/i);
  assert.equal(requests.length, 2);
});

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("contact name repair preserves messages, customers and other arenas/accounts under real RLS", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  try {
    for (const label of ["A", "B"]) arenas.push((await admin.arena.create({ data: { name: `Contacts QA ${label}`, slug: `contacts-qa-${randomUUID()}`, createdById: "goal-test" } })).id);
    const accountJid = "5511999990000@s.whatsapp.net", remoteJid = "5511999991111@s.whatsapp.net";
    const instanceName = `contacts-${randomUUID()}`;
    await admin.whatsAppConnection.create({ data: { arenaId: arenas[0], instanceName, connectedPhone: accountJid, status: "CONNECTED" } });
    const current = await admin.whatsAppConversation.create({ data: { arenaId: arenas[0], accountJid, remoteJid, contactName: "Arena Samas", unreadCount: 3, lastMessageAt: new Date("2026-01-01") } });
    const old = await admin.whatsAppConversation.create({ data: { arenaId: arenas[0], accountJid: "5511999999999@s.whatsapp.net", remoteJid, contactName: "Conta antiga" } });
    const other = await admin.whatsAppConversation.create({ data: { arenaId: arenas[1], accountJid, remoteJid, contactName: "Outra arena" } });
    await admin.whatsAppMessage.create({ data: { conversationId: current.id, providerId: "preserve", body: "Histórico preservado", direction: "INBOUND" } });
    const service = load("../src/lib/services/whatsapp-contact-sync.ts", {
      "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: any) => arenaDatabaseForTest(runtime, arenaId).$transaction(operation) },
    });
    const contacts = [{ remoteJid, phone: "5511999991111", name: "Cliente correto" }, { remoteJid: "5511888888888@s.whatsapp.net", phone: "5511888888888", name: "Contato sem conversa" }];
    assert.equal(await service.syncWhatsAppContactNames(arenas[0], accountJid, instanceName, contacts), 1);
    const saved = await admin.whatsAppConversation.findUniqueOrThrow({ where: { id: current.id }, include: { messages: true } });
    assert.equal(saved.contactName, "Cliente correto"); assert.equal(saved.unreadCount, 3); assert.equal(saved.lastMessageAt.getTime(), current.lastMessageAt.getTime()); assert.equal(saved.messages[0].body, "Histórico preservado");
    assert.equal((await admin.whatsAppConversation.findUniqueOrThrow({ where: { id: old.id } })).contactName, "Conta antiga");
    assert.equal((await admin.whatsAppConversation.findUniqueOrThrow({ where: { id: other.id } })).contactName, "Outra arena");
    assert.equal(await admin.whatsAppConversation.count({ where: { arenaId: arenas[0] } }), 2);
    assert.equal(await admin.player.count({ where: { arenaId: arenas[0] } }), 0);
    assert.equal(await service.syncWhatsAppContactNames(arenas[0], accountJid, instanceName, contacts), 0);
    await admin.whatsAppConnection.update({ where: { arenaId: arenas[0] }, data: { connectedPhone: "5511999999999@s.whatsapp.net" } });
    await assert.rejects(service.syncWhatsAppContactNames(arenas[0], accountJid, instanceName, contacts), /conta.*mudou/i);
  } finally {
    await admin.arena.deleteMany({ where: { id: { in: arenas } } }); await Promise.all([admin.$disconnect(), runtime.$disconnect()]);
  }
});
