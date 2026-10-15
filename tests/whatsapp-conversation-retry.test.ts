import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { conversationHistoryRetryDelay } from "../src/components/whatsapp/use-conversation-messages";

test("falhas transitórias do histórico usam espera progressiva limitada", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(conversationHistoryRetryDelay), [2_000, 4_000, 8_000, 16_000, 30_000, 30_000]);
  assert.equal(conversationHistoryRetryDelay(-1), 2_000);
});

test("histórico interrompido tenta de novo quando a aba ou rede retorna", () => {
  const source = readFileSync(new URL("../src/components/whatsapp/use-conversation-messages.ts", import.meta.url), "utf8");
  assert.match(source, /const timeout = window\.setTimeout\(\(\) => controller\.abort\(\), 10_000\)/);
  assert.match(source, /if \(active\) setFailedKey\(key\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", scheduleRetry\)/);
  assert.match(source, /window\.addEventListener\("online", scheduleRetry\)/);
  assert.match(source, /if \(visible\(\)\) setAttempt\(value => value \+ 1\)/);
});
