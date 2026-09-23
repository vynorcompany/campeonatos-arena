import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("stores inbound Evolution messages and exposes the arena WhatsApp workspace", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const webhook = readFileSync(resolve(process.cwd(), "src/app/api/integrations/evolution/webhook/route.ts"), "utf8");
  const nav = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  const chat = readFileSync(resolve(process.cwd(), "src/components/whatsapp/whatsapp-chat-workspace.tsx"), "utf8");
  assert.match(schema, /model WhatsAppConversation/);
  assert.match(schema, /model WhatsAppMessage/);
  assert.match(webhook, /whatsAppConversation\.upsert/);
  assert.match(webhook, /whatsAppMessage\.upsert/);
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

test("financial settings expose coupon and supplier maintenance", () => {
  const settings = readFileSync(resolve(process.cwd(), "src/app/(app)/financeiro/configuracoes/[area]/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/finance.ts"), "utf8");
  assert.match(settings, /updateCouponAction/);
  assert.match(settings, /updateSupplierAction/);
  assert.match(settings, /Cartão de débito/);
  assert.match(actions, /deleteCouponAction/);
  assert.match(actions, /deleteSupplierAction/);
});
