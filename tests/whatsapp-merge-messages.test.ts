import assert from "node:assert/strict";
import test from "node:test";
import { mergeWhatsAppMessages } from "../src/components/whatsapp/merge-messages";
import type { WhatsAppMessage } from "../src/components/whatsapp/types";

const message = (id: string, body: string, sentAt: string): WhatsAppMessage => ({
  id, body, sentAt, direction: "INBOUND", mediaType: "", mediaMimeType: "", mediaUrl: "",
});

test("histórico atualizado prevalece sobre a cópia inicial da conversa", () => {
  const snapshot = [message("a", "antigo", "2026-10-13T10:00:00.000Z")];
  const fetched = [message("a", "atualizado", "2026-10-13T10:00:00.000Z"), message("b", "novo", "2026-10-13T10:01:00.000Z")];
  assert.deepEqual(mergeWhatsAppMessages(snapshot, fetched, [], true).map(({ id, body }) => [id, body]), [["a", "atualizado"], ["b", "novo"]]);
});

test("envio local aparece antes da confirmação e não duplica o histórico", () => {
  const snapshot = [message("a", "recebida", "2026-10-13T10:00:00.000Z")];
  const fetched = [message("a", "recebida", "2026-10-13T10:00:00.000Z")];
  const optimistic = [message("b", "enviada", "2026-10-13T10:02:00.000Z")];
  assert.deepEqual(mergeWhatsAppMessages(snapshot, fetched, optimistic, true).map(({ id }) => id), ["a", "b"]);
});

test("mensagens removidas não retornam da cópia inicial após confirmar o histórico", () => {
  const snapshot = [message("removed", "antiga", "2026-10-13T10:00:00.000Z")];
  assert.deepEqual(mergeWhatsAppMessages(snapshot, [], [], true), []);
  assert.deepEqual(mergeWhatsAppMessages(snapshot, [], [], false).map(({ id }) => id), ["removed"]);
});
