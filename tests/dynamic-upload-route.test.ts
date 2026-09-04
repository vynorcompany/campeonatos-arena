import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const uploads = readFileSync(resolve(root, "src/lib/uploads.ts"), "utf8");
const routePath = resolve(root, "src/app/media/uploads/[...filePath]/route.ts");

test("serves volume-backed uploads through a dynamic media route", () => {
  assert.match(uploads, /return `\/media\/uploads\/\$\{safeFolder\}\/\$\{fileName\}`/);
  assert.ok(existsSync(routePath), "the dynamic upload route must exist");
  const route = readFileSync(routePath, "utf8");
  assert.match(route, /getPersistentUploadDirectory/);
  assert.match(route, /readFile/);
  assert.match(route, /filePath/);
});
