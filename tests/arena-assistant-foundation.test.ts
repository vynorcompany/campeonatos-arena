import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("keeps assistant conversations and command audit isolated from core arena modules", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const action = readFileSync(resolve(process.cwd(), "src/lib/actions/arena-assistant.ts"), "utf8");

  assert.match(schema, /model AssistantConversation \{/);
  assert.match(schema, /model AssistantMessage \{/);
  assert.match(schema, /model AssistantCommand \{/);
  assert.match(schema, /model FinancialEntry \{[\s\S]*source\s+String/);
  assert.match(schema, /model Plan \{[\s\S]*createdByUserId\s+String\?/);
  assert.match(schema, /model Teacher \{[\s\S]*createdByUserId\s+String\?/);
  assert.match(schema, /model Product \{[\s\S]*createdByUserId\s+String\?/);
  assert.match(action, /requireRole\("ADMIN"\)/);
  assert.match(action, /parseArenaAssistantCommand/);
  assert.match(action, /source:\s*"ASSISTANT"/);
});
