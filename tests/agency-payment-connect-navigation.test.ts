import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("agency payment OAuth starts with a normal navigation, never Next prefetch", () => {
  const source = readFileSync(new URL("../src/components/agency/agency-plans-content.tsx", import.meta.url), "utf8");
  assert.match(source, /<a href="\/api\/integrations\/payments\/mercado-pago\/agency\/connect"/);
  assert.doesNotMatch(source, /<Link href="\/api\/integrations\/payments\/mercado-pago\/agency\/connect"/);
});
