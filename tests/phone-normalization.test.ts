import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBrazilianPhone, sameBrazilianPhone } from "../src/lib/phone";
import { resolvePublicClientPlayer } from "../src/lib/services/public-client-registration";

test("normalizes DDI, masks and the legacy eight-digit mobile format", () => {
  assert.equal(normalizeBrazilianPhone("42 8808-5345"), "42988085345");
  assert.equal(normalizeBrazilianPhone("55 42 98808-5345"), "42988085345");
  assert.equal(sameBrazilianPhone("42 8808-5345", "5542988085345"), true);
});

test("reuses the existing athlete record when phone formatting differs", () => {
  const player = resolvePublicClientPlayer([{ id: "legacy", phone: "42 8808-5345" }], "5542988085345");
  assert.equal(player?.id, "legacy");
});
