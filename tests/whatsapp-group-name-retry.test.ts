import assert from "node:assert/strict";
import test from "node:test";
import { shouldRefreshWhatsAppGroupName, WHATSAPP_GROUP_NAME_RETRY_MS } from "../src/lib/whatsapp-group-name-retry";

test("unknown group names retry after provider failure without repeated immediate requests", () => {
  const group = { remoteJid: "120363000000@g.us", contactName: "Grupo do WhatsApp" };
  const now = Date.parse("2026-10-12T12:00:00.000Z");
  assert.equal(shouldRefreshWhatsAppGroupName(group, undefined, now), true);
  assert.equal(shouldRefreshWhatsAppGroupName(group, now + WHATSAPP_GROUP_NAME_RETRY_MS, now), false);
  assert.equal(shouldRefreshWhatsAppGroupName(group, now + WHATSAPP_GROUP_NAME_RETRY_MS, now + WHATSAPP_GROUP_NAME_RETRY_MS), true);
  assert.equal(shouldRefreshWhatsAppGroupName(group, Number.POSITIVE_INFINITY, now + WHATSAPP_GROUP_NAME_RETRY_MS), false);
});

test("known group names and individual conversations do not generate retry traffic", () => {
  const now = Date.parse("2026-10-12T12:00:00.000Z");
  assert.equal(shouldRefreshWhatsAppGroupName({ remoteJid: "120363000000@g.us", contactName: "Turma de padel" }, now - 1, now), false);
  assert.equal(shouldRefreshWhatsAppGroupName({ remoteJid: "5542999991234@s.whatsapp.net", contactName: "Grupo do WhatsApp" }, undefined, now), false);
});
