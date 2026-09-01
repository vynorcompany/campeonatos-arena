import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("avatar upload keeps the selected image available while crop rendering is still running", () => {
  const component = readFileSync(resolve(process.cwd(), "src/components/avatar-crop-field.tsx"), "utf8");

  assert.match(component, /outputRef\.current\.files\s*=\s*data\.files/);
  assert.match(component, /const selectImage[\s\S]*outputRef\.current\.files\s*=\s*data\.files/);
});
