import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();

async function readSource(...segments: string[]) {
  return readFile(path.join(workspaceRoot, ...segments), "utf8");
}

test("tournament sidebar keeps only games and rankings children", async () => {
  const source = await readSource("src", "components", "layout", "nav-links.tsx");

  assert.match(source, /href: "\/jogos", label: "Jogos"/);
  assert.match(source, /href: "\/torneios\/rankings", label: "Rankings"/);
  assert.doesNotMatch(source, /label: "Duplas"/);
  assert.doesNotMatch(source, /label: "Grupos"/);
});

test("event index uses aligned editorial rows with an Abrir action", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.match(source, /className="t-event-row"/);
  assert.match(source, /className="t-event-identity"/);
  assert.match(source, /className="t-event-metadata"/);
  assert.match(source, /className="t-event-action"/);
  assert.match(source, />\s*Abrir\s*</);
  assert.doesNotMatch(source, /<article className="section-card stack-sm"/);
});

test("event row styling subdues categories and reuses the row treatment for history", async () => {
  const [pageSource, source] = await Promise.all([
    readSource("src", "app", "(app)", "torneios", "page.tsx"),
    readSource("src", "app", "globals.css"),
  ]);

  assert.match(source, /\.t-event-row\s*\{[^}]*grid-template-columns:/s);
  assert.match(source, /\.t-event-category\s*\{[^}]*color:\s*var\(--muted\)/s);
  assert.match(source, /\.t-event-row-history\s*\{/);
  assert.match(pageSource, /className="t-event-list t-event-list-history"/);
  assert.match(
    source,
    /@media \(max-width: 1120px\)\s*\{[\s\S]*?\.t-event-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/,
  );
});
