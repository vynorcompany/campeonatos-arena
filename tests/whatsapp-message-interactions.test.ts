import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { reactionEmojis, readWhatsAppReactions, withWhatsAppReaction } from "../src/lib/whatsapp-message-data";
import { buildEvolutionTextPayload, evolutionRecipientNumber } from "../src/lib/integrations/evolution";
import { readEvolutionGroupName } from "../src/lib/integrations/evolution/groups";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";
import { presentWhatsAppGroupMessage } from "../src/lib/whatsapp-group-message";

const require = createRequire(import.meta.url);
function load(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date, Buffer, File, FormData,
    require: (name: string) => name in mocks ? mocks[name] : name === "@/lib/arena-database" ? { arenaDatabase: () => (mocks["@/lib/prisma"] as { prisma: unknown }).prisma } : require(name),
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

test("an accepted Evolution text response without JSON is not treated as a failed send", async () => {
  let requests = 0;
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const source = readFileSync(new URL("../src/lib/integrations/evolution/client.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    fetch: async () => { requests += 1; return { ok: true, status: 200, json: async () => { throw new SyntaxError("empty response"); } }; },
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
  assert.equal(Object.keys(await exports.sendEvolutionTextMessage("5511999999999", "Olá", "arena")).length, 0);
  assert.equal(requests, 1);
});

test("media retries only after format rejection, never after a server failure", async () => {
  const source = readFileSync(new URL("../src/lib/integrations/evolution/client.ts", import.meta.url), "utf8");
  for (const firstStatus of [400, 422, 500, 503]) {
    const sentMedia: string[] = [];
    const exports: Record<string, (...args: any[]) => Promise<any>> = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports,
      fetch: async (_url: string, options: { body: string }) => {
        sentMedia.push(JSON.parse(options.body).media);
        const status = sentMedia.length === 1 ? firstStatus : 201;
        return { ok: status === 201, status, json: async () => ({}), text: async () => "rejeitado" };
      },
      require: (name: string) => {
        if (name === "server-only") return {};
        if (name === "@/lib/env") return { env: { evolutionApiUrl: "https://provider.invalid", evolutionApiKey: "fixture" } };
        if (name === "@/lib/integrations/evolution") return { buildEvolutionTextPayload, evolutionRecipientNumber };
        if (name === "./groups") return { readEvolutionGroupName };
        if (name === "@/lib/payments/connection-secrets") return { decryptConnectionSecrets: () => ({ token: "" }) };
        if (name === "@/lib/prisma") return { prisma: { whatsAppConnection: { findUnique: async () => ({ status: "CONNECTED", instanceName: "test" }) } } };
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    const sending = exports.sendEvolutionMediaMessage("5511999999999", "data:application/pdf;base64,AAAA", "document", "a.pdf", "application/pdf", "arena");
    if (firstStatus >= 500) await assert.rejects(sending, new RegExp(`\\(${firstStatus}\\)`));
    else await sending;
    assert.deepEqual(sentMedia, firstStatus >= 500 ? ["data:application/pdf;base64,AAAA"] : ["data:application/pdf;base64,AAAA", "AAAA"]);
  }
});

test("reply and reaction actions validate the account and send original provider keys", async () => {
  const delivered: { kind: string; args: any[] }[] = [];
  const stored: any[] = [];
  const target = { id: "message", providerId: "original-provider", direction: "INBOUND", body: "Victor: Pergunta original", senderName: "", participantJid: "participant@s.whatsapp.net", providerPayload: { conversation: "Pergunta original" }, conversation: { id: "conversation", arenaId: "arena", accountJid: "current", remoteJid: "123456789012@g.us", contactName: "Grupo" } };
  const deliver = (kind: string) => async (...args: any[]) => { delivered.push({ kind, args }); return { key: { id: "new-provider" } }; };
  const actions = load("../src/lib/actions/whatsapp-chat.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/guards": { requireWhatsAppSend: async () => ({ arenaId: "arena", userId: "user", userName: "Atendente" }) },
    "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => "current" },
    "@/lib/whatsapp-message-data": { reactionEmojis },
    "@/lib/whatsapp-group-message": { presentWhatsAppGroupMessage },
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
  assert.equal(stored[0].quotedAuthor, "Victor");
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
  assert.equal(stored[3][2], target.conversation.remoteJid);
  assert.equal(stored[3][3], "original-provider");
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
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (tx: unknown) => unknown) => operation({}) },
    "@/lib/services/whatsapp-conversation": { persistWhatsAppReaction: async (...args: any[]) => { persisted.push(args); } },
  });
  const request = { nextUrl: { searchParams: new URLSearchParams("instance=test&secret=secret") }, headers: new Headers(), json: async () => ({ event: "MESSAGES_UPSERT", data: { key: { remoteJid: "contact@s.whatsapp.net", fromMe: false, id: "reaction-provider" }, message: { reactionMessage: { key: { id: "original-provider" }, text: "❤️" } } } }) };
  await webhook.POST(request);
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0][2], "contact@s.whatsapp.net");
  assert.equal(persisted[0][3], "original-provider");
  assert.equal(persisted[0][4], "contact@s.whatsapp.net");
  assert.equal(persisted[0][5], "❤️");
});

test("reaction webhook ignores a target from another conversation", async () => {
  let persisted = 0;
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": {},
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: "5511000000001@s.whatsapp.net" }) } } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid: (value: string) => value },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/rls": {},
    "@/lib/services/whatsapp-conversation": { persistWhatsAppReaction: async () => { persisted++; } },
  });
  const request = {
    nextUrl: { searchParams: new URLSearchParams("instance=test&secret=secret") },
    headers: new Headers(),
    json: async () => ({ event: "MESSAGES_UPSERT", data: { key: { remoteJid: "a@s.whatsapp.net", id: "reaction-provider" }, message: { reactionMessage: { key: { remoteJid: "b@s.whatsapp.net", id: "shared-provider" }, text: "👍" } } } }),
  };
  assert.equal((await webhook.POST(request)).ignored, "conversation-mismatch");
  assert.equal(persisted, 0);
});

test("reaction with repeated provider ID updates only its own conversation", async () => {
  const touched: string[] = [];
  const messages = [
    { id: "message-a", conversationId: "conversation-a", providerId: "shared-provider", remoteJid: "a@s.whatsapp.net" },
    { id: "message-b", conversationId: "conversation-b", providerId: "shared-provider", remoteJid: "b@s.whatsapp.net" },
  ];
  const tx = {
    whatsAppMessage: {
      findFirst: async ({ where }: any) => messages.find((message) => message.providerId === where.providerId && message.remoteJid === where.conversation.remoteJid) ?? null,
      findUniqueOrThrow: async () => ({ reactions: [] }),
      update: async ({ where }: any) => { touched.push(where.id); },
    },
    whatsAppConversation: { update: async ({ where }: any) => { touched.push(where.id); } },
    $queryRaw: async () => [],
  };
  const service = load("../src/lib/services/whatsapp-conversation.ts", {
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (tx: unknown) => unknown) => operation(tx) },
    "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => "account" },
    "@/lib/whatsapp-message-data": { readWhatsAppReactions, withWhatsAppReaction },
  });
  const result = await service.persistWhatsAppReaction("arena", "account", "b@s.whatsapp.net", "shared-provider", "actor", "👍");
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [{ actorJid: "actor", emoji: "👍" }]);
  assert.deepEqual(touched, ["message-b", "conversation-b"]);
  assert.equal(await service.persistWhatsAppReaction("arena", "account", "unknown@s.whatsapp.net", "shared-provider", "actor", "👍"), null);
  assert.deepEqual(touched, ["message-b", "conversation-b"]);
});

test("webhook de status de entrega não cria mensagem fantasma", async () => {
  let writes = 0;
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown) => body } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": {},
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena-a", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: "5511999991111@s.whatsapp.net" }) } } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/rls": { withArenaTransaction: async () => { writes += 1; } },
    "@/lib/services/whatsapp-conversation": {},
  });
  const request = {
    nextUrl: { searchParams: new URLSearchParams("instance=arena-a&secret=fixture") },
    headers: new Headers(),
    json: async () => ({ instance: "arena-a", event: "MESSAGES_UPDATE", data: { key: { remoteJid: "5511888880000@s.whatsapp.net", id: "delivery-status" }, status: "READ" } }),
  };
  assert.equal((await webhook.POST(request)).received, true);
  assert.equal(writes, 0);
});

test("webhook rejeita eventos cuja instância do payload difere da instância autenticada na URL", async () => {
  let connectionReads = 0;
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, options?: { status: number }) => ({ body, status: options?.status ?? 200 }) } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": {},
    "@/lib/payments/connection-secrets": {},
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => { connectionReads += 1; return null; } } } },
    "@/lib/whatsapp-account": {},
    "@/lib/integrations/evolution/agency": {},
    "@/lib/rls": {},
    "@/lib/services/whatsapp-conversation": {},
  });
  const request = {
    nextUrl: { searchParams: new URLSearchParams("instance=arena-a&secret=fixture") },
    headers: new Headers(),
    json: async () => ({ instance: "arena-b", event: "MESSAGES_UPSERT", data: { key: { id: "message-a" } } }),
  };
  const response = await webhook.POST(request);
  assert.equal(response.status, 401);
  assert.equal(connectionReads, 0);
});

test("webhook ignora mensagem atrasada da conta anterior após conectar outro número", async () => {
  let stored = false;
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown) => body } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": {},
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena-a", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: "5511999992222@s.whatsapp.net" }) } } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/rls": { withArenaTransaction: async () => { stored = true; } },
    "@/lib/services/whatsapp-conversation": {},
  });
  for (const owner of ["5511999991111", "5511999991111@s.whatsapp.net", "sender-fallback"]) {
    const request = {
      nextUrl: { searchParams: new URLSearchParams("instance=arena-a&secret=fixture") },
      headers: new Headers(),
      json: async () => ({ instance: "arena-a", sender: owner === "sender-fallback" ? "5511999991111@s.whatsapp.net" : undefined, event: "MESSAGES_UPSERT", data: { owner: owner === "sender-fallback" ? "" : owner, key: { id: "old-message", remoteJid: "5511888880000@s.whatsapp.net" }, message: { conversation: "Mensagem antiga" } } }),
    };
    const response = await webhook.POST(request);
    assert.equal(response.ignored, "account-mismatch");
  }
  assert.equal(stored, false);
});

test("webhook fora de ordem não reabre não lidas nem recua a última mensagem", async () => {
  const conversation = { id: "conversation", arenaId: "arena", accountJid: "111@s.whatsapp.net", remoteJid: "contact@s.whatsapp.net", profilePhotoUrl: "", unreadCount: 0, lastMessageAt: new Date(0), updatedAt: new Date(0) };
  const messages = new Set<string>();
  const tx = {
    whatsAppConversation: {
      upsert: async ({ create }: any) => {
        if (conversation.lastMessageAt.getTime() === 0) conversation.lastMessageAt = create.lastMessageAt;
        return { ...conversation };
      },
      update: async ({ data }: any) => {
        if (data.unreadCount !== undefined) conversation.unreadCount = typeof data.unreadCount === "number" ? data.unreadCount : conversation.unreadCount + data.unreadCount.increment;
        if (data.lastMessageAt) conversation.lastMessageAt = data.lastMessageAt;
        conversation.updatedAt = data.updatedAt;
        return { ...conversation };
      },
    },
    whatsAppMessage: {
      findUnique: async ({ where }: any) => messages.has(where.conversationId_providerId.providerId) ? { id: "stored" } : null,
      upsert: async ({ create }: any) => { messages.add(create.providerId); return { id: create.providerId }; },
    },
    $queryRaw: async () => [{ id: conversation.id }],
  };
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": { getEvolutionProfilePicture: async () => "" },
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: conversation.accountJid }) }, whatsAppMessage: { findFirst: async () => null } } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/integrations/evolution/groups": { readEvolutionGroupName: () => "" },
    "@/lib/services/whatsapp-conversation": {},
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (client: typeof tx) => unknown) => operation(tx) },
  });
  const sendEvent = (id: string, timestamp: number, fromMe: boolean) => webhook.POST({
    nextUrl: { searchParams: new URLSearchParams("instance=arena&secret=secret") }, headers: new Headers(),
    json: async () => ({ instance: "arena", event: "MESSAGES_UPSERT", data: { owner: "111", messageTimestamp: timestamp, key: { remoteJid: conversation.remoteJid, fromMe, id }, message: { conversation: id }, pushName: "Contato", profilePictureUrl: "https://example.test/photo.png" } }),
  });
  await sendEvent("received-first", 1_700_000_000, false);
  assert.equal(conversation.unreadCount, 1);
  await sendEvent("answered", 1_700_000_100, true);
  assert.equal(conversation.unreadCount, 0);
  const versionBeforeLateMessage = conversation.updatedAt.getTime();
  await sendEvent("received-late", 1_700_000_050, false);
  assert.equal(conversation.unreadCount, 0);
  assert.equal(conversation.lastMessageAt.getTime(), 1_700_000_100_000);
  assert.ok(conversation.updatedAt.getTime() > versionBeforeLateMessage);
  await sendEvent("received-new", 1_700_000_200, false);
  await sendEvent("answered-old", 1_700_000_150, true);
  await sendEvent("received-new", 1_700_000_200, false);
  assert.equal(conversation.unreadCount, 1);
  assert.equal(conversation.lastMessageAt.getTime(), 1_700_000_200_000);
  assert.equal(messages.size, 5);
  const liveSecond = Math.floor(Date.now() / 1000);
  await sendEvent("answered-now", liveSecond, true);
  conversation.lastMessageAt = new Date(liveSecond * 1000 + 700); // envio local tem precisão de milissegundos
  await sendEvent("received-same-second", liveSecond, false);
  assert.equal(conversation.unreadCount, 1, "a resposta no mesmo segundo do envio local não vira histórico");
  assert.equal(conversation.lastMessageAt.getTime(), liveSecond * 1000 + 701);
  await sendEvent("received-again-same-second", liveSecond, false);
  assert.equal(conversation.unreadCount, 2);
  assert.equal(conversation.lastMessageAt.getTime(), liveSecond * 1000 + 702);
  await sendEvent("late-outbound-echo", liveSecond, true);
  assert.equal(conversation.unreadCount, 2, "o eco atrasado do envio não apaga respostas mais recentes");
  assert.equal(messages.size, 9);
});

test("duplicate webhook messages count once and provider IDs remain scoped to each arena conversation", async () => {
  const conversations = new Map<string, { id: string; arenaId: string; accountJid: string; remoteJid: string; profilePhotoUrl: string; unreadCount: number; lastMessageAt: Date; updatedAt: Date }>();
  const messages = new Map<string, { id: string }>();
  const connections = [
    { id: "connection-a", instanceName: "instance-a", arenaId: "arena-a", connectedPhone: "111@s.whatsapp.net", status: "CONNECTED", webhookSecretHash: "hash" },
    { id: "connection-b", instanceName: "instance-b", arenaId: "arena-b", connectedPhone: "222@s.whatsapp.net", status: "CONNECTED", webhookSecretHash: "hash" },
  ];
  const tx = {
    whatsAppConversation: {
      upsert: async ({ where, create }: any) => {
        const key = JSON.stringify(where.arenaId_accountJid_remoteJid);
        if (!conversations.has(key)) conversations.set(key, { id: `conversation-${conversations.size}`, ...create, updatedAt: new Date(0) });
        return conversations.get(key);
      },
      update: async ({ where, data }: any) => {
        const conversation = [...conversations.values()].find((item) => item.id === where.id)!;
        if (data.unreadCount !== undefined) conversation.unreadCount = typeof data.unreadCount === "number" ? data.unreadCount : conversation.unreadCount + (data.unreadCount.increment ?? 0);
        if (data.lastMessageAt) conversation.lastMessageAt = data.lastMessageAt;
        conversation.updatedAt = data.updatedAt;
        return conversation;
      },
    },
    whatsAppMessage: {
      findUnique: async ({ where }: any) => messages.get(JSON.stringify(where.conversationId_providerId)) ?? null,
      upsert: async ({ where }: any) => {
        const key = JSON.stringify(where.conversationId_providerId);
        const message = { id: `message-${messages.size}` };
        messages.set(key, message);
        return message;
      },
    },
    $queryRaw: async () => [{ id: "locked" }],
  };
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": { getEvolutionGroupName: async () => "", getEvolutionProfilePicture: async () => "" },
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: {
      whatsAppConnection: { findUnique: async ({ where }: any) => connections.find((item) => item.instanceName === where.instanceName || item.id === where.id) ?? null },
      whatsAppMessage: { findFirst: async () => null },
    } },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/integrations/evolution/groups": { readEvolutionGroupName: () => "" },
    "@/lib/services/whatsapp-conversation": {},
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (client: typeof tx) => unknown) => operation(tx) },
  });
  for (const instance of ["instance-a", "instance-a", "instance-b"]) {
    const request = {
      nextUrl: { searchParams: new URLSearchParams(`instance=${instance}&secret=secret`) }, headers: new Headers(),
      json: async () => ({ instance, event: "MESSAGES_UPSERT", data: { owner: instance === "instance-a" ? "111" : "222", key: { remoteJid: "contact@s.whatsapp.net", fromMe: false, id: "same-provider-id" }, message: { conversation: "Olá" }, pushName: "Contato", profilePictureUrl: "https://example.test/photo.png" } }),
    };
    await webhook.POST(request);
  }
  assert.equal(conversations.size, 2);
  assert.equal(messages.size, 2);
  assert.deepEqual([...conversations.values()].map((item) => item.unreadCount), [1, 1]);
});

test("group webhook stores the participant name separately from the message body", async () => {
  const created: Record<string, unknown>[] = [];
  const tx = {
    whatsAppConversation: {
      upsert: async () => ({ id: "conversation", profilePhotoUrl: "", lastMessageAt: new Date(0), updatedAt: new Date(0) }),
      update: async () => ({}),
    },
    whatsAppMessage: {
      findUnique: async () => null,
      upsert: async ({ create }: { create: Record<string, unknown> }) => { created.push(create); return { id: "message" }; },
    },
    $queryRaw: async () => [{ id: "conversation" }],
  };
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": { getEvolutionGroupName: async () => "Grupo de teste" },
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: "111@s.whatsapp.net" }) } } },
    "@/lib/arena-database": { arenaDatabase: () => ({ whatsAppConversation: { findUnique: async () => null } }) },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/integrations/evolution/groups": { readEvolutionGroupName: () => "" },
    "@/lib/services/whatsapp-conversation": {},
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (client: typeof tx) => unknown) => operation(tx) },
  });
  await webhook.POST({
    nextUrl: { searchParams: new URLSearchParams("instance=group-instance&secret=secret") }, headers: new Headers(),
    json: async () => ({ instance: "group-instance", event: "MESSAGES_UPSERT", data: {
      owner: "111", key: { remoteJid: "123456789012@g.us", participant: "5511999991111@s.whatsapp.net", fromMe: false, id: "group-message" },
      pushName: "Victor", message: { conversation: "Olá!" },
    } }),
  });
  assert.equal(created.length, 1);
  assert.equal(created[0].senderName, "Victor");
  assert.equal(created[0].body, "Olá!");
  assert.equal(created[0].participantJid, "5511999991111@s.whatsapp.net");
});

test("group webhook refreshes known names without requesting metadata on every message", async () => {
  let providerCalls = 0;
  let savedName = "Grupo Arena GOAL";
  let messageNumber = 0;
  const tx = {
    whatsAppConversation: {
      upsert: async ({ update }: any) => {
        if (update.contactName) savedName = update.contactName;
        return { id: "conversation", contactName: savedName, profilePhotoUrl: "", lastMessageAt: new Date(0), updatedAt: new Date(0) };
      },
      update: async () => ({}),
    },
    whatsAppMessage: { findUnique: async () => null, upsert: async () => ({ id: "message" }) },
    $queryRaw: async () => [{ id: "conversation" }],
  };
  const webhook = load("../src/app/api/integrations/evolution/webhook/route.ts", {
    "next/server": { NextResponse: { json: (value: unknown) => value } },
    "@prisma/client": {},
    "@/lib/integrations/evolution/client": { getEvolutionGroupName: async () => { providerCalls += 1; return "Grupo Arena atualizado"; } },
    "@/lib/payments/connection-secrets": { hashWebhookSecret: () => "hash" },
    "@/lib/prisma": { prisma: { whatsAppConnection: { findUnique: async () => ({ id: "connection", arenaId: "arena", webhookSecretHash: "hash", status: "CONNECTED", connectedPhone: "111@s.whatsapp.net" }) } } },
    "@/lib/arena-database": { arenaDatabase: () => ({ whatsAppConversation: { findUnique: async () => ({ contactName: savedName }) } }) },
    "@/lib/whatsapp-account": { normalizeWhatsAppAccountJid },
    "@/lib/integrations/evolution/agency": {},
    "@/lib/integrations/evolution/groups": { readEvolutionGroupName: (value: { groupName?: string }) => value.groupName ?? "" },
    "@/lib/services/whatsapp-conversation": {},
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (client: typeof tx) => unknown) => operation(tx) },
  });
  await webhook.POST({
    nextUrl: { searchParams: new URLSearchParams("instance=group-instance&secret=secret") }, headers: new Headers(),
    json: async () => ({ instance: "group-instance", event: "MESSAGES_UPSERT", data: {
      owner: "111", key: { remoteJid: "123456789012@g.us", participant: "5511999991111@s.whatsapp.net", fromMe: false, id: `group-known-name-${++messageNumber}` },
      pushName: "Victor", message: { conversation: "Olá!" },
    } }),
  });
  assert.equal(savedName, "Grupo Arena atualizado");
  assert.equal(providerCalls, 1);
  await webhook.POST({
    nextUrl: { searchParams: new URLSearchParams("instance=group-instance&secret=secret") }, headers: new Headers(),
    json: async () => ({ instance: "group-instance", event: "MESSAGES_UPSERT", data: {
      owner: "111", key: { remoteJid: "123456789012@g.us", participant: "5511999991111@s.whatsapp.net", fromMe: false, id: `group-known-name-${++messageNumber}` },
      pushName: "Outro participante", message: { conversation: "Segunda mensagem" },
    } }),
  });
  assert.equal(savedName, "Grupo Arena atualizado");
  assert.equal(providerCalls, 1);
  await webhook.POST({
    nextUrl: { searchParams: new URLSearchParams("instance=group-instance&secret=secret") }, headers: new Headers(),
    json: async () => ({ instance: "group-instance", event: "MESSAGES_UPSERT", data: {
      owner: "111", groupName: "Novo nome do evento", key: { remoteJid: "123456789012@g.us", participant: "5511999991111@s.whatsapp.net", fromMe: false, id: `group-known-name-${++messageNumber}` },
      pushName: "Victor", message: { conversation: "Terceira mensagem" },
    } }),
  });
  assert.equal(savedName, "Novo nome do evento");
  assert.equal(providerCalls, 1);
});
