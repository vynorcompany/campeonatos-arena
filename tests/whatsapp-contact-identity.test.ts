import assert from "node:assert/strict";
import test from "node:test";
import { formatWhatsAppPhone, whatsAppConversationName, type WhatsAppConversation } from "../src/components/whatsapp/types";
import { evolutionRecipientNumber } from "../src/lib/integrations/evolution";
import { readEvolutionGroupName } from "../src/lib/integrations/evolution/groups";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function groupClient(fetch: (url: string, options: any) => Promise<any>, status = "CONNECTED") {
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/integrations/evolution/client.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, fetch, AbortSignal,
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "./groups") return { readEvolutionGroupName };
      if (name === "@/lib/env") return { env: { evolutionApiUrl: "https://provider.invalid", evolutionApiKey: "fixture" } };
      if (name === "@/lib/integrations/evolution") return {};
      if (name === "@/lib/payments/connection-secrets") return {};
      if (name === "@/lib/prisma") return { prisma: { whatsAppConnection: { findUnique: async () => ({ status, instanceName: "test" }) } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test("WhatsApp formats DDI separately from the DDD for mobile and landline numbers", () => {
  assert.equal(formatWhatsAppPhone("5542999991234"), "+55 (42) 99999-1234");
  assert.equal(formatWhatsAppPhone("+55 (42) 3333-1234"), "+55 (42) 3333-1234");
  assert.equal(formatWhatsAppPhone("42999991234"), "(42) 99999-1234");
  assert.equal(formatWhatsAppPhone("4233331234"), "(42) 3333-1234");
  assert.equal(formatWhatsAppPhone("55999991234"), "(55) 99999-1234");
  assert.equal(formatWhatsAppPhone("5555999991234"), "+55 (55) 99999-1234");
  assert.equal(formatWhatsAppPhone("+44 20 7946 0958"), "+44 20 7946 0958");
  assert.equal(formatWhatsAppPhone("+1 202 555 0123"), "+1 202 555 0123");
});

test("outbound WhatsApp keeps the country code even for DDD 55", () => {
  assert.equal(evolutionRecipientNumber("55999991234"), "5555999991234");
  assert.equal(evolutionRecipientNumber("5555999991234"), "5555999991234");
  assert.equal(evolutionRecipientNumber("120363000000@g.us"), "120363000000@g.us");
  assert.equal(evolutionRecipientNumber("+1 202 555 0123"), "12025550123");
});

test("numeric fallback contact names use the formatted contact phone", () => {
  const contact = { contactName: "554233331234", contactPhone: "554233331234", remoteJid: "554233331234@s.whatsapp.net", player: null } as WhatsAppConversation;
  assert.equal(whatsAppConversationName(contact), "+55 (42) 3333-1234");
  assert.equal(whatsAppConversationName({ ...contact, contactName: "Contato de teste" }), "Contato de teste");
  assert.equal(whatsAppConversationName({ ...contact, remoteJid: "120363000000@g.us", contactName: "Turma de teste" }), "Turma de teste");
});

test("group metadata reads nested envelopes and skips empty subjects without confusing other groups", () => {
  const groupJid = "120363000000@g.us";
  assert.equal(readEvolutionGroupName({ id: groupJid, subject: "Turma de teste" }, groupJid), "Turma de teste");
  assert.equal(readEvolutionGroupName({ data: { groups: [{ id: "other@g.us", subject: "Outra turma" }, { id: groupJid, subject: "", metadata: { subject: "Turma correta" } }] } }, groupJid), "Turma correta");
  assert.equal(readEvolutionGroupName({ response: [{ jid: "120363000000", subject: null, name: "Nome alternativo" }] }, groupJid), "Nome alternativo");
  assert.equal(readEvolutionGroupName([{ id: "other@g.us", subject: "Outra turma" }], groupJid), "");
  assert.equal(readEvolutionGroupName({ id: "other@g.us", metadata: { subject: "Outra turma" } }, groupJid), "");
  assert.equal(readEvolutionGroupName({ groupName: "", groupMetadata: { subject: "Nome do evento" } }, groupJid), "Nome do evento");
});

test("group client first fetches individual metadata and falls back to the GET list without participants", async () => {
  const calls: string[] = [];
  const client = groupClient(async url => {
    calls.push(url);
    return { ok: true, json: async () => url.includes("findGroupInfos") ? { subject: "" } : { data: [{ id: "120363000000@g.us", subject: "Turma de teste" }] } };
  });
  assert.equal(await client.getEvolutionGroupName("120363000000@g.us", "arena"), "Turma de teste");
  assert.match(calls[0], /findGroupInfos\/test\?groupJid=120363000000%40g.us/);
  assert.match(calls[1], /fetchAllGroups\/test\?getParticipants=false$/);
  assert.equal(calls.length, 2);
  const direct = groupClient(async url => { calls.push(url); return { ok: true, json: async () => ({ subject: "Nome direto" }) }; });
  assert.equal(await direct.getEvolutionGroupName("120363000000@g.us", "arena"), "Nome direto");
  assert.equal(calls.length, 3);
});

test("group metadata is not fetched for a disconnected account or individual contact", async () => {
  const fetch = async () => { throw new Error("must not call provider"); };
  assert.equal(await groupClient(fetch, "DISCONNECTED").getEvolutionGroupName("120363000000@g.us", "arena"), "");
  assert.equal(await groupClient(fetch).getEvolutionGroupName("554233331234@s.whatsapp.net", "arena"), "");
});
