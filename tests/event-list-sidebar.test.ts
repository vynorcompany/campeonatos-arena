import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFile } from "./helpers/style-source";
import assert from "node:assert/strict";
import test from "node:test";

import path from "node:path";

const workspaceRoot = process.cwd();

async function readSource(...segments: string[]) {
  return readFile(path.join(workspaceRoot, ...segments), "utf8");
}

test("tournament sidebar keeps active events and rankings children", async () => {
  const source = await readSource("src", "components", "layout", "nav-links.tsx");

  assert.match(source, /href: "\/jogos", label: "Eventos ativos"/);
  assert.match(source, /href: "\/torneios\/rankings", label: "Rankings"/);
  assert.doesNotMatch(source, /label: "Duplas"/);
  assert.doesNotMatch(source, /label: "Grupos"/);
});

test("event index uses aligned editorial rows with an Abrir action", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.match(source, /(?:className="t-event-row"|className=\{(?:cx\()?viewStyles\.t_event_row(?:\))?\})/);
  assert.match(source, /(?:className="t-event-identity"|className=\{(?:cx\()?viewStyles\.t_event_identity(?:\))?\})/);
  assert.match(source, /(?:className="t-event-metadata"|className=\{(?:cx\()?viewStyles\.t_event_metadata(?:\))?\})/);
  assert.match(source, /(?:className="t-event-action"|className=\{(?:cx\()?viewStyles\.t_event_action(?:\))?\})/);
  assert.match(source, />\s*Abrir\s*</);
  assert.doesNotMatch(source, /<article (?:className="section-card stack-sm"|className=\{(?:cx\()?viewStyles\.section_card_stack_sm(?:\))?\})/);
});

test("event row styling subdues categories and reuses the row treatment for history", async () => {
  const [pageSource, source] = await Promise.all([
    readSource("src", "app", "(app)", "torneios", "page.tsx"),
    readSource("src", "app", "globals.css"),
  ]);

  assert.match(styleRules("t-event-row"), /grid-template-columns:/);
  assert.match(styleRules("t-event-category"), /color: var\(--muted\)/);
  assert.ok(utilityClasses("t-event-row-history").length);
  assert.match(pageSource, /(?:className="t-event-list t-event-list-history"|className=\{(?:cx\()?viewStyles\.t_event_list(?:\))?\})/);
  assert.match(
    styleRules("t-event-row", {maxWidth: 1120}),
    /grid-template-columns:\s*minmax\(0, 1fr\) auto;/,
  );
});
