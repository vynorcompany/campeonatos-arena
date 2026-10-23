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

  assert.match(source, /href: "\/torneios"/);
  assert.match(source, /children: canSee\("tournaments"\) \? \[/);
  assert.match(source, /href: "\/torneios", label: "Eventos ativos"/);
  assert.match(source, /href: "\/torneios\/rankings", label: "Rankings"/);
  assert.doesNotMatch(source, /label: "Duplas"/);
  assert.doesNotMatch(source, /label: "Grupos"/);
});

test("unified directory uses the shared compact rows and exposes history", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");
  assert.match(source, /active_event_row/);
  assert.match(source, /Entrar no evento/);
  assert.match(source, /status=finished/);
  assert.match(styleRules("event-directory-row"), /grid-template-columns|display: grid/);
  const row = styleRules("event-directory-row");
  assert.doesNotMatch(row, /border-left-width: 4px/);
});
