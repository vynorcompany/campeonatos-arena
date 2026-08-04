import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { toPersistentArenaLogo } from "@/lib/uploads";

test("Arena profile action persists logos through the arena-specific helper", async () => {
  const actionSource = await readFile(path.join(process.cwd(), "src/lib/actions/arena.ts"), "utf8");

  assert.match(actionSource, /toPersistentArenaLogo\(/);
  assert.doesNotMatch(actionSource, /savePublicImageUpload\(/);
});

test("Arena logo is persisted as a PNG data URL", async () => {
  const file = new File([new Uint8Array([137, 80, 78, 71])], "arena.png", { type: "image/png" });

  const logoUrl = await toPersistentArenaLogo(file);

  assert.match(logoUrl ?? "", /^data:image\/png;base64,/);
});

test("Arena logo rejects files larger than 500 KB", async () => {
  const file = new File([new Uint8Array(500 * 1024 + 1)], "arena.png", { type: "image/png" });

  await assert.rejects(
    toPersistentArenaLogo(file),
    new Error("A imagem deve ter no máximo 500 KB.")
  );
});
