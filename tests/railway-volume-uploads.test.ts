import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { GET } from "../src/app/media/uploads/[...filePath]/route";
import { savePublicImageUpload } from "../src/lib/uploads";

const uploads = readFileSync(resolve(process.cwd(), "src/lib/uploads.ts"), "utf8");

test("uses the Railway volume mount as the persistent upload directory", () => {
  assert.match(uploads, /function getPersistentUploadDirectory\(\)/);
  assert.match(uploads, /process\.env\.RAILWAY_VOLUME_MOUNT_PATH\?\.trim\(\)/);
  assert.match(uploads, /if \(volumeMountPath\) return volumeMountPath/);
  assert.match(uploads, /path\.join\(getPersistentUploadDirectory\(\), "arenas", safeArenaId, safeFolder\)/);
});

test("volume uploads stay distinct across arenas and existing URLs remain readable", async () => {
  const root = await mkdtemp(join(tmpdir(), "arena-volume-uploads-"));
  const keys = [
    "NODE_ENV", "RAILWAY_VOLUME_MOUNT_PATH", "R2_ENDPOINT", "R2_BUCKET",
    "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE_URL"
  ] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.RAILWAY_VOLUME_MOUNT_PATH = root;
    for (const key of keys.filter((key) => key.startsWith("R2_"))) delete process.env[key];

    const first = await savePublicImageUpload(new File(["arena-a"], "image.jpg", { type: "image/jpeg" }), "portal-events", "event", "arena-a");
    const second = await savePublicImageUpload(new File(["arena-b"], "image.jpg", { type: "image/jpeg" }), "portal-events", "event", "arena-b");
    const repeated = await savePublicImageUpload(new File(["arena-a-again"], "image.jpg", { type: "image/jpeg" }), "portal-events", "event", "arena-a");

    assert.match(first!, /^\/media\/uploads\/arenas\/arena-a\/portal-events\/event-[\w-]+\.jpg$/);
    assert.match(second!, /^\/media\/uploads\/arenas\/arena-b\/portal-events\/event-[\w-]+\.jpg$/);
    assert.notEqual(first, repeated, "a second upload must not overwrite the first");

    const legacyDirectory = join(root, "portal-events");
    await mkdir(legacyDirectory);
    await writeFile(join(legacyDirectory, "existing.jpg"), "legacy");

    for (const [url, expected] of [
      [first!, "arena-a"], [second!, "arena-b"], [repeated!, "arena-a-again"],
      ["/media/uploads/portal-events/existing.jpg", "legacy"]
    ]) {
      const filePath = url.slice("/media/uploads/".length).split("/");
      const response = await GET(new Request(`http://localhost${url}`), { params: Promise.resolve({ filePath }) });
      assert.equal(response.status, 200, url);
      assert.equal(await response.text(), expected, url);
    }
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else Reflect.set(process.env, key, value);
    }
    // Only the directory created by this test is removed.
    await rm(root, { recursive: true, force: true });
  }
});
