import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("portal events accept larger source images and compress them before storage", () => {
  const uploads = read("src/lib/uploads.ts");
  const editor = read("src/components/portal-editor-panels.tsx");
  const nextConfig = read("next.config.mjs");
  const eventUpload = uploads.slice(uploads.indexOf("export async function saveOptimizedPortalEventImageUpload"));

  assert.match(uploads, /const maxPortalEventUploadSize = 25 \* 1024 \* 1024/);
  assert.match(eventUpload, /file\.size > maxPortalEventUploadSize/);
  assert.match(eventUpload, /A imagem original deve ter no máximo 25 MB/);
  assert.match(editor, /JPG, PNG ou WebP · até 25 MB/);
  assert.match(nextConfig, /bodySizeLimit: "25mb"/);
});
