import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("report rows and headers use the actual number of columns", () => {
  const page = readFileSync(new URL("../src/app/(app)/relatorios/[relatorio]/page.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/app/(app)/relatorios/[relatorio]/page.utilities.ts", import.meta.url), "utf8");

  assert.match(page, /"--report-columns": headers\.length/);
  assert.equal((styles.match(/repeat\(var\(--report-columns\),_minmax\(0,_1fr\)\)/g) ?? []).length, 2);
  assert.match(styles, /tw:viewport-800:\[&_article\]:grid-cols-\[1fr_1fr\]/);
  assert.match(styles, /tw:viewport-440:\[&_article\]:grid-cols-1!/);
});
