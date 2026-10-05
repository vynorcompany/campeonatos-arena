import assert from "node:assert/strict";
import test from "node:test";
import { groupMessageContent, groupParticipantColor, whatsAppSlaStatus } from "../src/lib/whatsapp-group-message";

test("structured group participants keep names separate and preserve colons in content", () => {
  assert.deepEqual(groupMessageContent({ direction: "INBOUND", senderName: "Ana", participantJid: "123@s.whatsapp.net", body: "Horário: 18:30" }), { name: "Ana", body: "Horário: 18:30" });
  assert.deepEqual(groupMessageContent({ direction: "INBOUND", participantJid: "123@s.whatsapp.net", body: "Ana: Horário: 18:30" }), { name: "Ana", body: "Horário: 18:30" });
  assert.deepEqual(groupMessageContent({ direction: "INBOUND", body: "Horário: 18:30" }), { name: "Participante", body: "Horário: 18:30" });
  assert.deepEqual(groupMessageContent({ direction: "OUTBOUND", senderName: "Equipe", body: "Horário: 18:30" }), { name: "Equipe", body: "Horário: 18:30" });
});

test("participant colors stay stable by identity and offer distinct readable colors", () => {
  assert.equal(groupParticipantColor("123@s.whatsapp.net"), groupParticipantColor("123@s.whatsapp.net"));
  assert.ok(new Set(Array.from({ length: 20 }, (_, i) => groupParticipantColor(`${i}@s.whatsapp.net`))).size > 1);
});

test("groups never generate SLA while individual conversations retain warning, overdue and resolved states", () => {
  const now = Date.parse("2026-10-05T18:00:00Z");
  const inbound = { direction: "INBOUND", sentAt: new Date(now - 100 * 60_000).toISOString() };
  const group = { remoteJid: "123@g.us", slaResolvedAt: null };
  const individual = { remoteJid: "123@s.whatsapp.net", slaResolvedAt: null };
  assert.equal(whatsAppSlaStatus(group, inbound, 60, now), "normal");
  assert.equal(whatsAppSlaStatus(individual, inbound, 60, now), "overdue");
  assert.equal(whatsAppSlaStatus(individual, { ...inbound, sentAt: new Date(now - 50 * 60_000).toISOString() }, 60, now), "warning");
  assert.equal(whatsAppSlaStatus({ ...individual, slaResolvedAt: new Date(now).toISOString() }, inbound, 60, now), "normal");
  assert.equal(whatsAppSlaStatus(individual, { ...inbound, direction: "OUTBOUND" }, 60, now), "normal");
});
