import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();

async function readSource(...segments: string[]) {
  return readFile(path.join(workspaceRoot, ...segments), "utf8");
}

test("event detail is an editorial category index", async () => {
  const source = await readSource(
    "src",
    "app",
    "(app)",
    "torneios",
    "[tournamentId]",
    "page.tsx",
  );

  assert.match(source, /CategoryList/);
  assert.doesNotMatch(source, /CategoryRegistrationPanel/);
  assert.doesNotMatch(source, /CategoryDrawPanel/);
  assert.doesNotMatch(source, /CategoryResultsPanel/);
});

test("event detail uses the operational dashboard layout", async () => {
  const source = await readSource(
    "src", "app", "(app)", "torneios", "[tournamentId]", "page.tsx",
  );
  const styles = await readSource("src", "app", "globals.css");

  assert.match(source, /event-operation-header/);
  assert.match(source, /event-metrics-grid/);
  assert.match(source, /event-detail-grid/);
  assert.match(source, /event-quick-actions/);
  assert.match(source, /EventIcon/);
  assert.doesNotMatch(source, /event-metric-icon">✎/);
  assert.match(styles, /\.event-metrics-grid\s*\{/);
  assert.match(styles, /\.event-detail-grid\s*\{/);
});

test("category list links each row to its dedicated workspace", async () => {
  const source = await readSource(
    "src",
    "components",
    "tournaments",
    "category-list.tsx",
  );

  assert.match(
    source,
    /href=\{`\/torneios\/\$\{tournamentId\}\/categorias\/\$\{category\.id\}`\}/,
  );
  assert.match(source, />\s*Entrar\s+<span/);
});

test("category tabs stay inside the selected category", async () => {
  const source = await readSource(
    "src",
    "components",
    "tournaments",
    "tournament-tabs.tsx",
  );

  for (const label of [
    "Visão geral",
    "Inscrições",
    "Grupos",
    "Jogos",
    "Resultados",
  ]) {
    assert.ok(source.includes(label), `missing category tab: ${label}`);
  }

  assert.match(
    source,
    /href=\{`\/torneios\/\$\{tournamentId\}\/categorias\/\$\{categoryId\}\?tab=\$\{tab\.key\}`\}/,
  );
});

test("category overview actions stay inside the dedicated category workspace", async () => {
  const routeSource = await readSource(
    "src",
    "app",
    "(app)",
    "torneios",
    "[tournamentId]",
    "categorias",
    "[categoryId]",
    "page.tsx",
  );

  assert.doesNotMatch(
    routeSource,
    /`\/torneios\/\$\{params\.tournamentId\}\?tab=/,
  );
  assert.match(
    routeSource,
    /`\/torneios\/\$\{params\.tournamentId\}\/categorias\/\$\{category\.id\}\?tab=/,
  );
});

test("category overview context names the selected pair ranking", async () => {
  const source = await readSource(
    "src",
    "app",
    "(app)",
    "torneios",
    "[tournamentId]",
    "categorias",
    "[categoryId]",
    "page.tsx",
  );

  assert.match(
    source,
    /category-overview-context[\s\S]*?Ranking:\s*\{competition\.ranking\?\.name\s*\?\?\s*"Sem ranking"\}/,
  );
});

test("dedicated category route scopes category, athletes, and rankings to the arena", async () => {
  const source = await readSource(
    "src",
    "app",
    "(app)",
    "torneios",
    "[tournamentId]",
    "categorias",
    "[categoryId]",
    "page.tsx",
  );

  assert.match(source, /requireModuleView\("tournaments"\)/);
  assert.match(source, /prisma\.tournamentCategory\.findFirst/);
  assert.match(source, /id:\s*params\.categoryId/);
  assert.match(source, /tournamentId:\s*params\.tournamentId/);
  assert.match(source, /tournament:\s*\{\s*arenaId:\s*auth\.arenaId/);
  assert.match(source, /prisma\.player\.findMany/);
  assert.match(source, /prisma\.rankingProfile\.findMany/);
  assert.ok(
    source.match(/arenaId:\s*auth\.arenaId/g)?.length === 3,
    "category, athletes, and rankings must all be arena-scoped",
  );
});

test("dedicated category route renders operational panels for the selected category only", async () => {
  const source = await readSource(
    "src",
    "app",
    "(app)",
    "torneios",
    "[tournamentId]",
    "categorias",
    "[categoryId]",
    "page.tsx",
  );

  assert.match(source, /href=\{`\/torneios\/\$\{params\.tournamentId\}`\}/);
  assert.equal(
    source.match(/categories=\{\[categoryView\]\}/g)?.length,
    4,
    "registration, groups, games, and results panels must receive one category",
  );
});

test("event category rows use the operational dashboard grid", async () => {
  const source = await readSource("src", "app", "globals.css");

  assert.match(
    source,
    /\.t-category-row\s*\{[^}]*grid-template-columns:\s*40px\s+minmax\(0,\s*1fr\)\s+6\.5rem\s+8\.5rem\s+6rem\s+7rem;/s,
  );
  assert.match(source, /\.t-category-row\s*\{[^}]*padding:\s*15px\s+0;/s);
  assert.match(source, /\.t-category-enter\s*\{[^}]*text-align:\s*center;/s);
});
