import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try {
    const url = new URL(testUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal" && url.username === "postgres";
  } catch { return false; }
})();

test("limpeza atualiza o histórico aberto e remove mensagens locais imediatamente", () => {
  const workspace = readFileSync(new URL("../src/components/whatsapp/whatsapp-chat-workspace.tsx", import.meta.url), "utf8");
  assert.match(workspace, /action === "clear"[\s\S]*?setLocalMessages\(\(current\) => \(\{ \.\.\.current, \[conversation\.id\]: \[\] \}\)\)/);
  assert.match(workspace, /action === "clear"[\s\S]*?messageHistory\.retry\(\)/);
});

test("limpar conversa zera mensagens, não lidas e SLA sem tocar em outra conta ou arena", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const conversationIds: string[] = [];
  const accountJid = "5511999990000@s.whatsapp.net";
  const suffix = randomBytes(6).toString("hex");
  try {
    const arenaA = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    const arenaB = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
    for (const [arenaId, account, remote] of [
      [arenaA.id, accountJid, `goal-clear-${suffix}-own@g.us`],
      [arenaA.id, "5511999999999@s.whatsapp.net", `goal-clear-${suffix}-old@g.us`],
      [arenaB.id, accountJid, `goal-clear-${suffix}-other@g.us`],
    ]) {
      const conversation = await admin.whatsAppConversation.create({ data: { arenaId, accountJid: account, remoteJid: remote, unreadCount: 2 } });
      conversationIds.push(conversation.id);
      await admin.whatsAppMessage.create({ data: { conversationId: conversation.id, providerId: `goal-clear-${conversation.id}`, direction: "INBOUND", body: "Mensagem descartável" } });
    }

    const source = readFileSync(new URL("../src/lib/actions/whatsapp-chat.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const require = createRequire(import.meta.url);
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
      exports, Date, File, FormData, Buffer,
      require: (name: string) => {
        if (name === "next/cache") return { revalidatePath() {} };
        if (name === "@/lib/auth/guards") return { requireWhatsAppManage: async () => ({ arenaId: arenaA.id }) };
        if (name === "@/lib/whatsapp-active-account") return { getActiveWhatsAppAccountJid: async () => accountJid };
        if (name === "@/lib/arena-database") return { arenaDatabase: () => runtime };
        if (name === "@/lib/rls") return { withArenaTransaction: (arenaId: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
          return operation(tx);
        }) };
        if (name.startsWith("@/")) return {};
        return require(name);
      },
    });
    const clear = (conversationId: string) => {
      const form = new FormData();
      form.set("conversationId", conversationId);
      form.set("action", "clear");
      return exports.updateWhatsAppConversationAction(form);
    };

    await assert.rejects(clear(conversationIds[1]), /Conversa não encontrada/);
    await assert.rejects(clear(conversationIds[2]), /Conversa não encontrada/);
    const before = await admin.whatsAppConversation.findUniqueOrThrow({ where: { id: conversationIds[0] }, select: { revision: true } });
    await clear(conversationIds[0]);
    const own = await admin.whatsAppConversation.findUniqueOrThrow({ where: { id: conversationIds[0] } });
    assert.equal(own.unreadCount, 0);
    assert.ok(own.slaResolvedAt);
    assert.ok(own.revision > before.revision);
    assert.equal(await admin.whatsAppMessage.count({ where: { conversationId: conversationIds[0] } }), 0);
    for (const id of conversationIds.slice(1)) {
      assert.equal((await admin.whatsAppConversation.findUniqueOrThrow({ where: { id } })).unreadCount, 2);
      assert.equal(await admin.whatsAppMessage.count({ where: { conversationId: id } }), 1);
    }
  } finally {
    await admin.whatsAppMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await admin.whatsAppConversation.deleteMany({ where: { id: { in: conversationIds } } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
