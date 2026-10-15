import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { nextWhatsAppConversationVersion } from "../src/lib/whatsapp-conversation-version";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("cada mensagem nova avança a versão, inclusive no mesmo milissegundo", () => {
  const prior = new Date("2038-01-01T12:00:00.000Z");
  assert.equal(nextWhatsAppConversationVersion(prior, prior).getTime(), prior.getTime() + 1);
  assert.equal(nextWhatsAppConversationVersion(prior, new Date(prior.getTime() + 20)).getTime(), prior.getTime() + 20);
});

test("webhook sinaliza mensagem histórica ao chat sem alterar última resposta ou não lidas", () => {
  const webhook = readFileSync(new URL("../src/app/api/integrations/evolution/webhook/route.ts", import.meta.url), "utf8");
  const pulse = readFileSync(new URL("../src/app/api/whatsapp/pulse/route.ts", import.meta.url), "utf8");
  assert.match(webhook, /if \(sentAt >= current\.lastMessageAt\)[\s\S]*?else \{\s*\/\/ Ainda assim, o chat precisa recarregar essa mensagem histórica\.[\s\S]*?data: \{ updatedAt \}/);
  assert.match(pulse, /latest\.updatedAt\.getTime\(\)/);
});

test("mensagem histórica altera a versão persistida sem recuar a conversa", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da versão WhatsApp descartável");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const lastMessageAt = new Date("2038-01-02T12:00:00.000Z");
      const conversation = await tx.whatsAppConversation.create({ data: {
        arenaId: arena.id, accountJid: "goal@s.whatsapp.net", remoteJid: "historico-goal@s.whatsapp.net",
        contactName: "Contato descartável", lastMessageAt, unreadCount: 0,
      }, select: { id: true, updatedAt: true } });
      await tx.whatsAppMessage.create({ data: {
        conversationId: conversation.id, providerId: "goal-historical-message", direction: "INBOUND",
        body: "Mensagem descartável", sentAt: new Date("2038-01-01T12:00:00.000Z"),
      } });
      const updated = await tx.whatsAppConversation.update({ where: { id: conversation.id }, data: {
        updatedAt: nextWhatsAppConversationVersion(conversation.updatedAt),
      }, select: { updatedAt: true, lastMessageAt: true, unreadCount: true } });
      assert.ok(updated.updatedAt.getTime() > conversation.updatedAt.getTime());
      assert.equal(updated.lastMessageAt.getTime(), lastMessageAt.getTime());
      assert.equal(updated.unreadCount, 0);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
