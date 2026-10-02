import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync("src/app/(app)/whatsapp/page.tsx", "utf8");
const pulse = readFileSync("src/app/api/whatsapp/pulse/route.ts", "utf8");
const realtime = readFileSync("src/components/whatsapp/use-whatsapp-realtime.ts", "utf8");

test("WhatsApp inbox sends only rendered message fields to the browser", () => {
  assert.match(page, /messages:\s*\{[\s\S]*?select:\s*\{\s*id: true, direction: true, body: true/);
  assert.doesNotMatch(page, /providerPayload/);
  assert.doesNotMatch(page, /include:\s*\{\s*player:/);
});

test("WhatsApp realtime refreshes on conversation version changes, not a timer", () => {
  assert.match(pulse, /orderBy:\s*\{ updatedAt: "desc" \}/);
  assert.match(realtime, /if \(version\.current !== payload\.version\)/);
  assert.doesNotMatch(realtime, /lastReconcile|12_000/);
  assert.match(realtime, /if \(disposed \|\| checking \|\| paused/);
});
