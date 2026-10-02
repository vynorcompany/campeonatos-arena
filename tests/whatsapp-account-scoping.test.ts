import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { normalizeWhatsAppAccountJid } from "../src/lib/whatsapp-account";

test("WhatsApp owner JID is canonical across device and provider suffixes", () => {
  assert.equal(normalizeWhatsAppAccountJid("554299633125@s.whatsapp.net"), "554299633125@s.whatsapp.net");
  assert.equal(normalizeWhatsAppAccountJid("554299633125:7@c.us"), "554299633125@s.whatsapp.net");
  assert.equal(normalizeWhatsAppAccountJid(""), "");
  assert.equal(normalizeWhatsAppAccountJid("Grupo do WhatsApp"), "");
});

test("inbox, media and webhook bind conversations to the connected WhatsApp owner", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const inbox = readFileSync(resolve(process.cwd(), "src/app/(app)/whatsapp/page.tsx"), "utf8");
  const webhook = readFileSync(resolve(process.cwd(), "src/app/api/integrations/evolution/webhook/route.ts"), "utf8");
  const media = readFileSync(resolve(process.cwd(), "src/app/api/whatsapp/media/[messageId]/route.ts"), "utf8");
  assert.match(schema, /@@unique\(\[arenaId, accountJid, remoteJid\]\)/);
  assert.match(inbox, /where: \{ arenaId: auth\.arenaId, accountJid \}/);
  assert.match(webhook, /arenaId_accountJid_remoteJid/);
  assert.match(media, /conversation: \{ arenaId: auth\.arenaId, accountJid \}/);
});
