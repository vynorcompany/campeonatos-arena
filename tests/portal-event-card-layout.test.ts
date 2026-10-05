import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";
import postcss from "postcss";

const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

test("portal event cards stay compact on desktop and balanced on mobile", () => {
  assert.match(styles, /grid-template-columns: repeat\(auto-fill, minmax\(220px, 280px\)\)/);
  assert.match(styles, /justify-content: start/);
  assert.match(styleRules("client-portal-event-posts", {"context":"img"}), /width: 100%[\s\S]*aspect-ratio: 16 \/ 9/);
  assert.match(styleRules("client-portal-event-posts", {"maxWidth":620}), /grid-template-columns: 1fr/);
});

test("portal management renders events as a fixed-width thumbnail feed", () => {
  assert.match(styleRules("portal-event-post-list"), /display: grid[\s\S]*grid-template-columns: repeat\(auto-fill, minmax\(170px, 190px\)\)[\s\S]*row-gap: 12px[\s\S]*justify-content: start/);
  assert.match(styleRules("portal-event-post-list", {"context":"img"}), /display: block[\s\S]*width: 100%[\s\S]*aspect-ratio: 4 \/ 5/);
  assert.match(styleRules("portal-event-post-list", {maxWidth: 620}), /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});
