import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { reactionEmojis, readWhatsAppReactions, withWhatsAppReaction } from "../src/lib/whatsapp-message-data";
import { buildEvolutionTextPayload, evolutionRecipientNumber } from "../src/lib/integrations/evolution";
import { readEvolutionGroupName } from "../src/lib/integrations/evolution/groups";

const require = createRequire(import.meta.url);
function load(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, Buffer, File, FormData,
    require: (name: string) => name in mocks ? mocks[name] : require(name),
  });
  return exports;
}

test("reactions replace only the same actor, survive retries, and can be removed", () => {
  const first = withWhatsAppReaction([], "arena", "👍");
  assert.deepEqual(withWhatsAppReaction(first, "arena", "👍"), first);
  const second = withWhatsAppReaction(first, "contact", "❤️");
  assert.deepEqual(withWhatsAppReaction(second, "arena", "😂"), [{ actorJid: "contact", emoji: "❤️" }, { actorJid: "arena", emoji: "😂" }]);
  assert.deepEqual(withWhatsAppReaction(second, "arena", ""), [{ actorJid: "contact", emoji: "❤️" }]);
  assert.deepEqual(readWhatsAppReactions(null), []);
});

test("Evolution requests carry quoted messages and native reactions, including group JIDs", async () => {
  const requests: { url: string; body: any }[] = [];
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const source = readFileSync(new URL("../src/lib/integrations/evolution/client.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    fetch: async (url: string, options: any) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true, status: 201, json: async () => ({}) }; },
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@/lib/env") return { env: { evolutionApiUrl: "https://provider.invalid", evolutionApiKey: "fixture" } };
      if (name === "@/lib/integrations/evolution") return { buildEvolutionTextPayload, evolutionRecipientNumber };
      if (name === "./groups") return { readEvolutionGroupName };
      if (name === "@/lib/payments/connection-secrets") return { decryptConnectionSecrets: () => ({ token: "" }) };
      if (name === "@/lib/prisma") return { prisma: { whatsAppConnection: { findUnique: async () => ({ status: "CONNECTED", instanceName: "test", encryptedToken: "fixture" }) } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const quoted = { key: { id: "original", remoteJid: "123456789012@g.us", fromMe: false, participant: "5511000000001@s.whatsapp.net" }, message: { conversation: "Original" } };
  await exports.sendEvolutionTextMessage(quoted.key.remoteJid, "Resposta", "arena", quoted);
  await exports.sendEvolutionAudioMessage(quoted.key.remoteJid, "data:audio/webm;base64,AAAA", "arena", quoted);
  await exports.sendEvolutionMediaMessage(quoted.key.remoteJid, "data:application/pdf;base64,AAAA", "document", "a.pdf", "application/pdf", "arena", quoted);
  for (const request of requests) {
    assert.equal(request.body.number, quoted.key.remoteJid);
    assert.equal(request.body.quoted.key.id, "original");
    assert.equal(request.body.quoted.message.conversation, "Original");
  }
  await exports.sendEvolutionReaction(quoted.key, "👍", "arena");
  assert.match(requests[3].url, /\/message\/sendReaction\/test$/);
  assert.equal(requests[3].body.key.id, "original");
  assert.equal(requests[3].body.reaction, "👍");
  await exports.sendEvolutionReaction(quoted.key, "", "arena");
  assert.equal(requests[4].body.reaction, "");
});

test("reply and reaction actions validate the account and send original provider keys", async () => {
  const delivered: { kind: string; args: any[] }[] = [];
  const stored: any[] = [];
  const target = { id: "message", providerId: "original-provider", direction: "INBOUND", body: "Pergunta original", senderName: "", participantJid: "participant@s.whatsapp.net", providerPayload: { conversation: "Pergunta original" }, conversation: { id: "conversation", arenaId: "arena", accountJid: "current", remoteJid: "123456789012@g.us", contactName: "Grupo" } };
  const deliver = (kind: string) => async (...args: any[]) => { delivered.push({ kind, args }); return { key: { id: "new-provider" } }; };
  const actions = load("../src/lib/actions/whatsapp-chat.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: "arena", userId: "user", userName: "Atendente" }) },
    "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => "current" },
    "@/lib/whatsapp-message-data": { reactionEmojis },
    "@/lib/prisma": { prisma: { whatsAppMessage: { findFirst: async ({ where }: any) => where.id === target.id && where.conversation.arenaId === "arena" && where.conversation.accountJid === "current" && (!where.conversation.id || where.conversation.id === "conversation") ? target : null } } },
    "@/lib/rls": {},
    "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: deliver("text"), sendEvolutionAudioMessage: deliver("audio"), sendEvolutionMediaMessage: deliver("media"), sendEvolutionReaction: deliver("reaction") },
    "@/lib/services/whatsapp-conversation": {
      getArenaWhatsAppConversation: async () => ({ id: "conversation", contactPhone: "123456789012", remoteJid: target.conversation.remoteJid }),
      getEvolutionProviderId: () => "new-provider",
      persistOutboundWhatsAppMessage: async (_a: string, _c: string, message: any) => { stored.push(message); return message; },
      persistWhatsAppReaction: async (...args: any[]) => { stored.push(args); return []; },
    },
  });
  const form = new FormData(); form.set("conversationId", "conversation"); form.set("body", "Resposta"); form.set("replyToId", "message"); form.set("quotedBody", "Texto falsificado");
  await actions.sendWhatsAppChatMessageAction(form);
  form.set("audio", new File(["audio"], "a.webm", { type: "audio/webm" }));
  await actions.sendWhatsAppAudioMessageAction(form);
  form.set("file", new File(["pdf"], "a.pdf", { type: "application/pdf" }));
  await actions.sendWhatsAppMediaMessageAction(form);
  for (const item of delivered) {
    assert.equal(item.args[0], target.conversation.remoteJid);
    const quote = item.args.at(-1);
    assert.equal(quote.key.id, "original-provider");
    assert.equal(quote.key.fromMe, false);
    assert.equal(quote.key.participant, target.participantJid);
    assert.equal(quote.message.conversation, "Pergunta original");
  }
  assert.equal(stored[0].quotedBody, "Pergunta original");
  assert.equal(stored[0].body, "Resposta");
  form.set("replyToId", "other-account-message");
  await assert.rejects(actions.sendWhatsAppChatMessageAction(form), /não pertence/);
  const reaction = new FormData(); reaction.set("messageId", "other-account-message"); reaction.set("emoji", "👍");
  await assert.rejects(actions.reactToWhatsAppMessageAction(reaction), /não encontrada/);
  assert.equal(delivered.length, 3);
  reaction.set("messageId", "message");
  await actions.reactToWhatsAppMessageAction(reaction);
  assert.equal(delivered[3].kind, "reaction");
  assert.equal(delivered[3].args[0].id, "original-provider");
  assert.equal(delivered[3].args[1], "👍");
  reaction.set("emoji", "");
  await actions.reactToWhatsAppMessageAction(reaction);
  assert.equal(delivered[4].args[1], "");
});

test("reaction webhooks update the original message without incrementing unread counts", async () => {
  const persisted: any[][] = [];
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": {},
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: "5511000000001@s.whatsapp.net" }) } } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid: (value: string) => value },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/services/whatsapp-conversation": { persistWhatsAppReaction: async (...args: any[]) => { persisted.push(args); } },
  });
  const request = { nextUrl: { searchParams: new URLSearchParams("instance=test&secret=secret") }, headers: new Headers(), json: async () => ({ event: "MESSAGES_UPSERT", data: { key: { remoteJid: "contact@s.whatsapp.net", fromMe: false, id: "reaction-provider" }, message: { reactionMessage: { key: { id: "original-provider" }, text: "❤️" } } } }) };
  await webhook.POST(request);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0][2], "original-provider");
  assert.equal(persisted[0][3], "contact@s.whatsapp.net");
  assert.equal(persisted[0][4], "❤️");
});
