import assert from "node:assert/strict";
import test from "node:test";
import { whatsAppSendFailureMessage } from "../src/lib/whatsapp-send-feedback";

test("WhatsApp send feedback keeps actionable known errors and hides internal details", () => {
  assert.equal(whatsAppSendFailureMessage(new Error("A Evolution recusou o envio da mensagem (403).")), "A Evolution recusou o envio da mensagem (403).");
  assert.equal(whatsAppSendFailureMessage(new Error("Sem permissão para enviar mensagens no WhatsApp.")), "Sem permissão para enviar mensagens no WhatsApp.");
  assert.equal(whatsAppSendFailureMessage(new Error("Database query failed: secret")), "Não foi possível enviar a mensagem. Tente novamente ou informe o suporte.");
});
