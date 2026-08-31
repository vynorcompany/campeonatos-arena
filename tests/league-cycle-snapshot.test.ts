import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("closing a legacy League cycle archives its unlinked competition matches", () => {
  const lifecycle = readFileSync(resolve(process.cwd(), "src/lib/league/lifecycle.ts"), "utf8");

  assert.match(lifecycle, /matches: \{ include:/);
  assert.match(lifecycle, /cycle[.]matches[.]length [\?] cycle[.]matches : competition[.]matches[.]filter/);
  assert.match(lifecycle, /match[.]leagueCycleId === null/);
});
