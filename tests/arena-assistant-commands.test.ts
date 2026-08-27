import assert from "node:assert/strict";
import test from "node:test";

import { parseArenaAssistantCommand } from "../src/lib/assistant/commands";

test("parses a receivable invoice command with client, amount and today's date", () => {
  const command = parseArenaAssistantCommand("Crie uma fatura no valor de 560,00 para o cliente Alexandre com a data de hoje.");

  assert.deepEqual(command, {
    type: "CREATE_RECEIVABLE_INVOICE",
    clientName: "Alexandre",
    amountCents: 56000,
    dueDate: "TODAY"
  });
});

test("rejects commands outside the approved assistant command catalog", () => {
  assert.equal(parseArenaAssistantCommand("Apague todos os clientes da arena."), null);
});
