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
  const [cardSource, routeSource] = await Promise.all([
    readSource(
      "src",
      "components",
      "tournaments",
      "category-competition-form.tsx",
    ),
    readSource(
      "src",
      "app",
      "(app)",
      "torneios",
      "[tournamentId]",
      "categorias",
      "[categoryId]",
      "page.tsx",
    ),
  ]);

  assert.match(cardSource, /categoryId:\s*string/);
  assert.match(
    cardSource,
    /`\/torneios\/\$\{tournamentId\}\/categorias\/\$\{categoryId\}\?tab=/,
  );
  assert.doesNotMatch(
    cardSource,
    /`\/torneios\/\$\{tournamentId\}\?tab=/,
  );
  assert.match(
    routeSource,
    /<CategoryCompetitionCard[\s\S]*?categoryId=\{category\.id\}/,
  );
});

test("category workspace header names the selected pair ranking", async () => {
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
    /t-category-workspace-header[\s\S]*?Ranking:\s*\{competition\.ranking\?\.name\s*\?\?\s*"Sem ranking"\}/,
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

test("editorial category rows use the approved restrained grid", async () => {
  const source = await readSource("src", "app", "globals.css");

  assert.match(
    source,
    /\.t-category-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+9rem\s+7rem\s+8rem;/s,
  );
  assert.match(source, /\.t-category-row\s*\{[^}]*padding:\s*15px\s+0;/s);
  assert.match(source, /\.t-category-enter\s*\{[^}]*text-align:\s*right;/s);
});
