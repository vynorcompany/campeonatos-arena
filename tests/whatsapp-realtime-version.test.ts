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
  assert.match(pulse, /connection!\.inboxRevision\.toString\(\)/);
  const history = readFileSync(new URL("../src/app/api/whatsapp/conversations/[conversationId]/messages/route.ts", import.meta.url), "utf8");
  assert.match(history, /conversation\.revision\.toString\(\)/);
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

test("revisão da caixa avança entre conversas com datas iguais sem vazar entre arenas", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da revisão da caixa descartável");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenas = await tx.arena.findMany({ select: { id: true }, take: 2, orderBy: { id: "asc" } });
      assert.equal(arenas.length, 2, "O teste exige duas arenas fictícias.");
      for (const arena of arenas) {
        await tx.whatsAppConnection.upsert({
          where: { arenaId: arena.id },
          create: { arenaId: arena.id, instanceName: `goal-revision-${arena.id}`, status: "CONNECTED", connectedPhone: "goal@s.whatsapp.net" },
          update: {},
        });
      }
      const revision = async (arenaId: string) => (await tx.whatsAppConnection.findUniqueOrThrow({ where: { arenaId }, select: { inboxRevision: true } })).inboxRevision;
      const firstArena = arenas[0].id;
      const secondArena = arenas[1].id;
      const firstRevision = await revision(firstArena);
      const secondRevision = await revision(secondArena);
      const sentAt = new Date("2038-01-02T12:00:00.000Z");
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${firstArena}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const first = await tx.whatsAppConversation.create({ data: { arenaId: firstArena, accountJid: "goal@s.whatsapp.net", remoteJid: "revision-a@s.whatsapp.net", lastMessageAt: sentAt } });
      await tx.whatsAppConversation.create({ data: { arenaId: firstArena, accountJid: "goal@s.whatsapp.net", remoteJid: "revision-b@s.whatsapp.net", lastMessageAt: sentAt } });
      assert.equal(await revision(firstArena), firstRevision + 2n);
      const sameTimestamp = new Date("2038-01-01T12:00:00.000Z");
      const firstUpdate = await tx.whatsAppConversation.update({ where: { id: first.id }, data: { updatedAt: sameTimestamp } });
      const secondUpdate = await tx.whatsAppConversation.update({ where: { id: first.id }, data: { updatedAt: sameTimestamp } });
      assert.equal(firstUpdate.updatedAt.getTime(), secondUpdate.updatedAt.getTime());
      assert.equal(secondUpdate.revision, firstUpdate.revision + 1n);
      assert.equal(await revision(firstArena), firstRevision + 4n);
      assert.equal(await revision(secondArena), secondRevision);
      await tx.$executeRawUnsafe("RESET ROLE");
      await tx.whatsAppConversation.create({ data: { arenaId: secondArena, accountJid: "goal@s.whatsapp.net", remoteJid: "revision-c@s.whatsapp.net", lastMessageAt: sentAt } });
      assert.equal(await revision(secondArena), secondRevision + 1n);
      assert.equal(await revision(firstArena), firstRevision + 4n);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
