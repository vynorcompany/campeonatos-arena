import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("arena shell keeps navigation in a closable mobile drawer", () => {
  const frame = source("src/components/layout/mobile-app-frame.tsx");
  const shell = source("src/components/layout/app-shell.tsx");
  const styles = source("src/components/layout/app-shell.utilities.ts");
  assert.match(shell, /MobileAppFrame/);
  assert.match(shell, /id="arena-mobile-navigation"/);
  assert.match(frame, /aria-expanded=\{menuOpen\}/);
  assert.match(frame, /event\.key === "Escape"/);
  assert.match(frame, /setMenuOpen\(false\)/);
  assert.match(styles, /mobile-nav-open/);
  assert.match(styles, /viewport-760:-translate-x-full/);
});

test("agenda uses a compact date strip and a contained, keyboard-accessible court grid", () => {
  const page = source("src/app/(app)/agenda/page.tsx");
  const styles = source("src/app/(app)/agenda/page.utilities.ts");
  assert.match(page, /role="region" aria-label="Grade de horários por quadra" tabIndex=\{0\}/);
  assert.match(page, /const gridMinWidth = 64 \+ courts\.length \* 180/);
  assert.match(styles, /viewport-700:grid-cols-\[repeat\(3,_minmax\(0,_1fr\)\)\]/);
  assert.match(styles, /viewport-700:\[&_tbody_>_tr_>_th\]:sticky/);
});
