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
    exports, Date, FormData, Buffer,
    require: (name: string) => name in mocks ? mocks[name] : require(name),
  });
  return exports;
}

test("colaborador autorizado envia e persiste mensagem só na arena conectada", { skip: !disposableDatabase }, async () => {
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
      const other = await tx.whatsAppConversation.create({ data: { arenaId: arenaB.id, accountJid, remoteJid: "5511777770000@s.whatsapp.net", contactPhone: "5511777770000" } });

      await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaA.id}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      const service = loadActions("../src/lib/services/whatsapp-conversation.ts", {
        "@/lib/rls": { withArenaTransaction: async (_arenaId: string, operation: (client: typeof tx) => Promise<unknown>) => operation(tx) },
        "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => accountJid },
        "@/lib/whatsapp-message-data": { readWhatsAppReactions },
      });
      let delivered = 0;
      const actions = loadActions("../src/lib/actions/whatsapp-chat.ts", {
        "next/cache": { revalidatePath() {} },
        "@/lib/auth/guards": guards,
        "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: async (_phone: string, _body: string, arenaId: string) => {
          assert.equal(arenaId, arenaA.id); delivered += 1; return { key: { id: "goal-provider-id" } };
        } },
        "@/lib/services/whatsapp-conversation": service,
        "@/lib/whatsapp-active-account": { getActiveWhatsAppAccountJid: async () => accountJid },
        "@/lib/prisma": { prisma: tx },
        "@/lib/arena-database": { arenaDatabase: () => tx },
        "@/lib/rls": {},
        "@/lib/whatsapp-message-data": { reactionEmojis: [] },
        "@/lib/whatsapp-media-types": {},
        "@/lib/whatsapp-group-message": {},
      });
      const form = new FormData(); form.set("conversationId", own.id); form.set("body", "Resposta descartável");
      const result = await actions.sendWhatsAppChatMessageAction(form);
      assert.equal(result.body, "Resposta descartável");
      assert.equal(result.senderName, user.name);
      assert.equal(delivered, 1);
      const stored = await tx.whatsAppMessage.findUniqueOrThrow({ where: { conversationId_providerId: { conversationId: own.id, providerId: "goal-provider-id" } } });
      assert.equal(stored.senderUserId, user.id);
      assert.equal(stored.direction, "OUTBOUND");
      assert.equal((await tx.whatsAppConversation.findUniqueOrThrow({ where: { id: own.id } })).unreadCount, 0);
      authContext.editPermissions = [];
      await assert.rejects(actions.sendWhatsAppChatMessageAction(form), /Sem permissão para enviar/);
      assert.equal(delivered, 1);
      authContext.editPermissions = member.editPermissions;
      form.set("conversationId", other.id);
      await assert.rejects(actions.sendWhatsAppChatMessageAction(form), /Conversa não encontrada/);
      assert.equal(delivered, 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
    assert.equal(await db.user.count({ where: { email } }), 0);
  } finally {
    await db.$disconnect();
  }
});
