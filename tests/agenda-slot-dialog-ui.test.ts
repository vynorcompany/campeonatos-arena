import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("agenda opens a central dialog for every slot", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");
  const dialog = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
  assert.match(page, /AgendaSlotDialog/);
  assert.match(dialog, /agenda-slot-trigger/);
  assert.match(dialog, /agenda-slot-backdrop/);
  assert.match(css, /backdrop-filter: blur/);
});
