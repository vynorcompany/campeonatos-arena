import assert from "node:assert/strict";
import test from "node:test";
import { toPersistentArenaLogo } from "@/lib/uploads";

test("Arena logo is persisted as a PNG data URL", async () => {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "arena.png", { type: "image/png" });

  const logoUrl = await toPersistentArenaLogo(file);

  assert.match(logoUrl ?? "", /^data:image\/png;base64,/);
});
