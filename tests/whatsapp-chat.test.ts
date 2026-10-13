import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("stores inbound Evolution messages and exposes the arena WhatsApp workspace", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const webhook = readFileSync(resolve(process.cwd(), "src/app/api/integrations/evolution/webhook/route.ts"), "utf8");
  const nav = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  const chat = readFileSync(resolve(process.cwd(), "src/components/whatsapp/whatsapp-chat-workspace.tsx"), "utf8");
  assert.match(schema, /model WhatsAppConversation/);
  assert.match(schema, /model WhatsAppMessage/);
  assert.match(schema, /@@unique\(\[conversationId, providerId\]\)/);
  assert.match(webhook, /whatsAppConversation\.upsert/);
  assert.match(webhook, /whatsAppMessage\.upsert/);
  assert.match(webhook, /conversationId_providerId: messageKey/);
  assert.match(webhook, /if \(!existingMessage\) \{[\s\S]*?unreadCount: \{ increment: 1 \}/);
  assert.match(nav, /href: "\/whatsapp"/);
  assert.match(nav, /nav-unread-badge/);
  assert.match(chat, /sendWhatsAppChatMessageAction/);
});

test("WhatsApp composer is state-driven instead of injecting controls into the DOM", () => {
  const chat = readFileSync(resolve(process.cwd(), "src/components/whatsapp/whatsapp-chat-workspace.tsx"), "utf8");
  const recorder = readFileSync(resolve(process.cwd(), "src/components/whatsapp/use-audio-recorder.ts"), "utf8");

  assert.match(chat, /useAudioRecorder/);
  assert.match(chat, /sendWhatsAppMediaMessageAction/);
  assert.match(chat, /audioDraft/);
  assert.doesNotMatch(chat, /document\.querySelector/);
  assert.doesNotMatch(chat, /document\.createElement/);
  assert.match(recorder, /navigator\.mediaDevices\.getUserMedia/);
});

test("a recorded audio draft remains bound to the conversation where recording began", () => {
  const chat = readFileSync(resolve(process.cwd(), "src/components/whatsapp/whatsapp-chat-workspace.tsx"), "utf8");
  assert.match(chat, /type AudioDraft = \{ file: File; previewUrl: string; conversationId: string \}/);
  assert.match(chat, /recordingConversationId\.current = active\.id/);
  assert.match(chat, /draft\.conversationId !== active\.id/);
  assert.match(chat, /form\.set\("conversationId", conversationId\); form\.set\("audio", draft\.file\)/);
  assert.match(chat, /audioDraft\?\.conversationId === active\.id/);
});

test("foto indisponível do WhatsApp retorna às iniciais sem exibir imagem quebrada", () => {
  const chat = readFileSync(resolve(process.cwd(), "src/components/whatsapp/whatsapp-chat-workspace.tsx"), "utf8");
  assert.match(chat, /onError=\{\(\) => setPhoto\(""\)\}/);
  assert.match(chat, /: initials\(conversation\.contactName \|\| conversation\.contactPhone\)/);
});

test("outbound WhatsApp deliveries share one idempotent persistence service", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/whatsapp-chat.ts"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/whatsapp-conversation.ts"), "utf8");

  assert.match(actions, /persistOutboundWhatsAppMessage/);
  assert.match(actions, /getArenaWhatsAppConversation/);
  assert.match(service, /where: \{ conversationId_providerId: \{ conversationId, providerId: message\.providerId \} \}/);
  assert.match(service, /withArenaTransaction/);
});

test("financial settings expose coupon and supplier maintenance", () => {
  const settings = readFileSync(resolve(process.cwd(), "src/app/(app)/financeiro/configuracoes/[area]/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");
  assert.match(settings, /updateCouponAction/);
  assert.match(settings, /updateSupplierAction/);
  assert.match(settings, /Cartão de débito/);
  assert.match(actions, /deleteCouponAction/);
  assert.match(actions, /deleteSupplierAction/);
});
