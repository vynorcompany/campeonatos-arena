import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("global controls expose a visible keyboard focus treatment", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(css, /:where\(a, button, input, select, textarea\):focus-visible/);
  assert.match(css, /outline:\s*2px solid var\(--brand\)/);
  assert.match(css, /outline-offset:\s*2px/);
});
