import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const uploads = readFileSync(resolve(process.cwd(), "src/lib/uploads.ts"), "utf8");

test("uses the Railway volume mount as the persistent upload directory", () => {
  assert.match(uploads, /function getPersistentUploadDirectory\(\)/);
  assert.match(uploads, /process\.env\.RAILWAY_VOLUME_MOUNT_PATH\?\.trim\(\)/);
  assert.match(uploads, /if \(volumeMountPath\) return volumeMountPath/);
  assert.match(uploads, /path\.join\(getPersistentUploadDirectory\(\), safeFolder\)/);
});
