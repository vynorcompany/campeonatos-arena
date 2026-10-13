import assert from "node:assert/strict";
// Included in the default Node test discovery (which scans .test.ts files).
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { presentWhatsAppGroupMessage } from "../src/lib/whatsapp-group-message";
import { WhatsAppMessageBubble } from "../src/components/whatsapp/whatsapp-message-bubble";

test("new and older group messages show an author separate from the body", () => {
  assert.deepEqual(presentWhatsAppGroupMessage({ isGroup: true, direction: "INBOUND", body: "Olá!", senderName: "Victor" }), { senderName: "Victor", body: "Olá!" });
  assert.deepEqual(presentWhatsAppGroupMessage({ isGroup: true, direction: "INBOUND", body: "Victor: Olá!" }), { senderName: "Victor", body: "Olá!" });
  assert.deepEqual(presentWhatsAppGroupMessage({ isGroup: false, direction: "INBOUND", body: "Assunto: Olá!" }), { senderName: "", body: "Assunto: Olá!" });
});

test("group author renders in bold without duplicating their name in message text", () => {
  const html = renderToStaticMarkup(createElement(WhatsAppMessageBubble, {
    message: { id: "message", direction: "INBOUND", body: "Victor: Olá!", mediaType: "", mediaMimeType: "", mediaUrl: "", sentAt: "2026-10-13T12:00:00.000Z" },
    isGroup: true, accountJid: "account", canEdit: false, menuOpen: false, pending: false,
    onMenu: () => {}, onReply: () => {}, onReact: () => {}, onImage: () => {},
  }));
  assert.match(html, /<strong[^>]*>Victor<\/strong>/);
  assert.match(html, /<p>Olá!<\/p>/);
  assert.doesNotMatch(html, /Victor: Olá!/);
});
