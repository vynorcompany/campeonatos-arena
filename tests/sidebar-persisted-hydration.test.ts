import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("both sidebars restore saved submenus after the initial server-matching render", () => {
  const hook = readFileSync(new URL("../src/components/layout/use-persisted-open-items.ts", import.meta.url), "utf8");
  for (const file of ["agency-nav-links.tsx", "nav-links.tsx"]) {
    const sidebar = readFileSync(new URL(`../src/components/layout/${file}`, import.meta.url), "utf8");
    assert.match(sidebar, /usePersistedOpenItems\(/);
    assert.doesNotMatch(sidebar, /localStorage\.getItem/);
  }
  assert.match(hook, /useState<Set<string>>\(\(\) => new Set\(initialItems\)\)/);
  assert.match(hook, /useEffect\(\(\) => \{[\s\S]*?localStorage\.getItem/);
  assert.match(hook, /if \(!restored\) return/);
});
