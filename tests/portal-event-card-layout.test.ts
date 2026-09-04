import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

test("portal event cards stay compact on desktop and balanced on mobile", () => {
  assert.match(styles, /grid-template-columns: repeat\(auto-fill, minmax\(220px, 280px\)\)/);
  assert.match(styles, /justify-content: start/);
  assert.match(styles, /\.client-portal-event-posts img \{ width: 100%; aspect-ratio: 4 \/ 5;/);
  assert.match(styles, /@media \(max-width: 620px\) \{[^}]*\.client-portal-event-posts \{ grid-template-columns: 1fr;/);
});

test("portal management renders events as a fixed-width thumbnail feed", () => {
  assert.match(styles, /\.portal-event-post-list \{ display: grid; grid-template-columns: repeat\(auto-fill, minmax\(170px, 190px\)\); gap: 12px; justify-content: start; \}/);
  assert.match(styles, /\.portal-event-post-list img \{ display: block; width: 100%; aspect-ratio: 4 \/ 5;/);
  assert.match(styles, /@media \(max-width: 620px\) \{[^}]*\.portal-event-post-list \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
});
