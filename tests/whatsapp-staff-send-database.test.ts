import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";
import { canSendWhatsApp } from "../src/lib/permissions";
import { readWhatsAppReactions } from "../src/lib/whatsapp-message-data";
import { outgoingWhatsAppMediaKind } from "../src/lib/whatsapp-media-types";

const require = createRequire(import.meta.url);
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres"; }
  catch { return false; }
})();

function loadActions(path: string, mocks: Record<string, unknown>) {
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, Date, File, FormData, Buffer,
    require: (name: string) => name in mocks ? mocks[name] : require(name),
  });
  return exports;
}

test("colaborador autorizado envia texto, áudio e PDF só pela conta da arena conectada", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback do WhatsApp descartável");
  const email = `goal-whatsapp-${randomBytes(6).toString("hex")}@example.test`;
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const user = await tx.user.create({ data: { name: "Atendente descartável", email, passwordHash: "hash-descartável", systemRole: "VIEWER" } });
      const profile = await tx.permissionProfile.create({ data: { arenaId: arenaA.id, name: `Administrador GOAL ${randomBytes(4).toString("hex")}`, editPermissions: ["support:whatsapp:send"], viewPermissions: ["support"] } });
      const member = await tx.arenaMember.create({ data: { arenaId: arenaA.id, userId: user.id, role: "STAFF", permissionProfileId: profile.id, editPermissions: profile.editPermissions, viewPermissions: profile.viewPermissions } });
      assert.equal(canSendWhatsApp(member.role, user.systemRole, member.editPermissions), true);
      const authContext = { arenaId: arenaA.id, arenaRole: member.role, systemRole: user.systemRole, editPermissions: member.editPermissions, viewPermissions: member.viewPermissions, userId: user.id, userName: user.name };
      const guards = loadActions("../src/lib/auth/guards.ts", {
        "@/lib/auth/session": { requireArenaAccess: async () => authContext },
        "next/navigation": { notFound: () => { throw new Error("not found"); } },
        "@/lib/permissions": { canSendWhatsApp },
      });
      const accountJid = "5511999990000@s.whatsapp.net";
      const own = await tx.whatsAppConversation.create({ data: { arenaId: arenaA.id, accountJid, remoteJid: "5511888880000@s.whatsapp.net", contactPhone: "5511888880000", contactName: "Contato de teste", unreadCount: 2 } });
      const previousAccount = await tx.whatsAppConversation.create({ data: { arenaId: arenaA.id, accountJid: "5511999999999@s.whatsapp.net", remoteJid: "5511888880001@s.whatsapp.net", contactPhone: "5511888880001" } });
      const other = await tx.whatsAppConversation.create({ data: { arenaId: arenaB.id, accountJid, remoteJid: "5511777770000@s.whatsapp.net", contactPhone: "5511777770000" } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const service = loadActions("../src/lib/services/whatsapp-conversation.ts", {
        "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (client: typeof tx) => Promise<unknown>) => operation(tx) },
        "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => accountJid },
        "@/lib/whatsapp-message-data": { readWhatsAppReactions },
      });
      let delivered = 0;
      let replyDuringDelivery = false;
      const deliver = async (arenaId: string) => {
        assert.equal(arenaId, arenaA.id);
        delivered += 1;
        if (replyDuringDelivery) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const inboundAt = new Date();
          await tx.whatsAppMessage.create({ data: { conversationId: own.id, providerId: "goal-inbound-during-send", direction: "INBOUND", body: "Resposta recebida durante envio", sentAt: inboundAt, createdAt: inboundAt } });
          await tx.whatsAppConversation.update({ where: { id: own.id }, data: { lastMessageAt: inboundAt, unreadCount: { increment: 1 } } });
        }
        return { key: { id: `goal-provider-${delivered}` } };
      };
      const actions = loadActions("../src/lib/actions/whatsapp-chat.ts", {
        "next/cache": { revalidatePath() {} },
        "@/lib/auth/guards": guards,
        "@/lib/integrations/evolution/client": {
          sendEvolutionTextMessage: async (_phone: string, _body: string, arenaId: string) => deliver(arenaId),
          sendEvolutionAudioMessage: async (_phone: string, _audio: string, arenaId: string) => deliver(arenaId),
          sendEvolutionMediaMessage: async (_phone: string, _media: string, _kind: string, _name: string, _mime: string, arenaId: string) => deliver(arenaId),
        },
        "@/lib/services/whatsapp-conversation": service,
        "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => accountJid },
        "@/lib/prisma": { prisma: tx },
        "@/lib/arena-database": { arenaDatabase: () => tx },
        "@/lib/rls": {},
        "@/lib/whatsapp-message-data": { reactionEmojis: [] },
        "@/lib/whatsapp-media-types": { outgoingWhatsAppMediaKind },
        "@/lib/whatsapp-group-message": {},
      });
      const form = new FormData(); form.set("conversationId", own.id); form.set("body", "Resposta descartável");
      const result = await actions.sendWhatsAppChatMessageAction(form);
      assert.equal(result.body, "Resposta descartável");
      assert.equal(result.senderName, user.name);
      const audio = new FormData(); audio.set("conversationId", own.id); audio.set("audio", new File(["áudio descartável"], "teste.webm", { type: "audio/webm" }));
      const attachment = new FormData(); attachment.set("conversationId", own.id); attachment.set("file", new File(["PDF descartável"], "teste.pdf", { type: "application/pdf" }));
      assert.equal((await actions.sendWhatsAppAudioMessageAction(audio)).mediaType, "AUDIO");
      assert.equal((await actions.sendWhatsAppMediaMessageAction(attachment)).mediaType, "DOCUMENT");
      assert.equal(delivered, 3);
      const stored = await tx.whatsAppMessage.findMany({ where: { conversationId: own.id }, orderBy: { providerId: "asc" } });
      assert.deepEqual(stored.map((message) => message.providerId), ["goal-provider-1", "goal-provider-2", "goal-provider-3"]);
      assert.ok(stored.every((message) => message.senderUserId === user.id && message.direction === "OUTBOUND"));
      assert.equal((await tx.whatsAppConversation.findUniqueOrThrow({ where: { id: own.id } })).unreadCount, 0);
      replyDuringDelivery = true;
      const delayed = await actions.sendWhatsAppChatMessageAction(form);
      assert.equal(delayed.body, "Resposta descartável");
      const afterReply = await tx.whatsAppConversation.findUniqueOrThrow({ where: { id: own.id } });
      const inbound = await tx.whatsAppMessage.findUniqueOrThrow({ where: { conversationId_providerId: { conversationId: own.id, providerId: "goal-inbound-during-send" } } });
      assert.equal(afterReply.unreadCount, 1, "a resposta recebida durante o envio continua não lida");
      assert.equal(afterReply.lastMessageAt.getTime(), inbound.sentAt.getTime(), "a resposta recebida permanece a última mensagem");
      assert.equal((await tx.whatsAppMessage.findUniqueOrThrow({ where: { conversationId_providerId: { conversationId: own.id, providerId: "goal-provider-4" } } })).direction, "OUTBOUND");
      authContext.editPermissions = [];
      for (const [action, input] of [["sendWhatsAppChatMessageAction", form], ["sendWhatsAppAudioMessageAction", audio], ["sendWhatsAppMediaMessageAction", attachment]] as const) {
        await assert.rejects(actions[action](input), /Sem permissão para enviar/);
      }
      assert.equal(delivered, 4);
      authContext.editPermissions = member.editPermissions;
      for (const invalidConversation of [previousAccount.id, other.id]) {
        for (const [action, input] of [["sendWhatsAppChatMessageAction", form], ["sendWhatsAppAudioMessageAction", audio], ["sendWhatsAppMediaMessageAction", attachment]] as const) {
          input.set("conversationId", invalidConversation);
          await assert.rejects(actions[action](input), /Conversa não encontrada/);
        }
      }
      assert.equal(delivered, 4);
      throw rollback;
    }), (error: unknown) => error === rollback);
    assert.equal(await db.user.count({ where: { email } }), 0);
  } finally {
    await db.$disconnect();
  }
});
