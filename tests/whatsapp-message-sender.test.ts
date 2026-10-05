import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

test("author is persisted even when the webhook records the outbound message first", async () => {
  let stored: Record<string, unknown> = { id: "message", senderName: "", senderUserId: "", sentAt: new Date() };
  const tx = {
    whatsAppConversation: { findFirst: async () => ({ id: "conversation" }), updateMany: async () => ({ count: 1 }) },
    whatsAppMessage: { upsert: async ({ update }: { update: Record<string, unknown> }) => { stored = { ...stored, ...update }; return stored; } },
  };
  const source = readFileSync(new URL("../src/lib/services/whatsapp-conversation.ts", import.meta.url), "utf8");
  const exports: Record<string, (...args: unknown[]) => Promise<Record<string, unknown>>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Date,
    require: (name: string) => {
      if (name === "@/lib/rls") return { withArenaTransaction: async (_id: string, operation: (tx: unknown) => unknown) => operation(tx) };
      if (name === "@/lib/whatsapp-active-account") return { getActiveWhatsAppAccountJid: async () => "account" };
      return require(name);
    },
  });
  const result = await exports.persistOutboundWhatsAppMessage("arena", "conversation", { providerId: "provider", body: "Olá!", senderUserId: "user", senderName: "Atendente" });
  assert.equal(stored.senderUserId, "user");
  assert.equal(stored.senderName, "Atendente");
  assert.equal(result.senderName, "Atendente");
  assert.equal(result.body, "Olá!");
  assert.equal(result.mediaUrl, "");
});

test("text, audio and attachments store authenticated authors without sending their names to WhatsApp", async () => {
  const persisted: Record<string, unknown>[] = [];
  const delivered: unknown[][] = [];
  const source = readFileSync(new URL("../src/lib/actions/whatsapp-chat.ts", import.meta.url), "utf8");
  const exports: Record<string, (form: FormData) => Promise<unknown>> = {};
  const deliver = async (...args: unknown[]) => { delivered.push(args); return { key: { id: "provider" } }; };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, File, FormData, Buffer,
    require: (name: string) => {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "@/lib/auth/guards") return { requireModuleEdit: async () => ({ arenaId: "arena", userId: "authenticated-id", userName: "Atendente de teste" }) };
      if (name === "@/lib/integrations/evolution/client") return { sendEvolutionTextMessage: deliver, sendEvolutionAudioMessage: deliver, sendEvolutionMediaMessage: deliver };
      if (name === "@/lib/services/whatsapp-conversation") return {
        getArenaWhatsAppConversation: async () => ({ id: "conversation", contactPhone: "11999999999" }),
        getEvolutionProviderId: () => "provider",
        persistOutboundWhatsAppMessage: async (_arena: string, _conversation: string, message: Record<string, unknown>) => { persisted.push(message); return message; },
      };
      if (name.startsWith("@/")) return {};
      return require(name);
    },
  });
  const text = new FormData(); text.set("conversationId", "conversation"); text.set("body", "Olá!"); text.set("senderName", "Nome falsificado");
  await exports.sendWhatsAppChatMessageAction(text);
  const audio = new FormData(); audio.set("conversationId", "conversation"); audio.set("audio", new File(["audio"], "audio.webm", { type: "audio/webm" }));
  await exports.sendWhatsAppAudioMessageAction(audio);
  const attachment = new FormData(); attachment.set("conversationId", "conversation"); attachment.set("file", new File(["pdf"], "arquivo.pdf", { type: "application/pdf" }));
  await exports.sendWhatsAppMediaMessageAction(attachment);
  assert.equal(persisted.length, 3);
  for (const message of persisted) {
    assert.equal(message.senderUserId, "authenticated-id");
    assert.equal(message.senderName, "Atendente de teste");
  }
  assert.equal(delivered[0][1], "Olá!");
  assert.equal(persisted[0].body, "Olá!");
  assert.equal(persisted[1].body, "Áudio");
  assert.equal(persisted[2].body, "Documento");
  assert.ok(!JSON.stringify(delivered).includes("Atendente de teste"));
  assert.ok(!JSON.stringify(delivered).includes("authenticated-id"));
});
