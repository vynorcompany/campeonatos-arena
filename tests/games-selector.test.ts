import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();

async function readSource(...segments: string[]) {
  return readFile(path.join(workspaceRoot, ...segments), "utf8");
}

test("games starts with arena-scoped active events", async () => {
  const source = await readSource("src", "app", "(app)", "jogos", "page.tsx");

  assert.match(source, /prisma\.tournament\.findMany/);
  assert.match(source, /arenaId:\s*auth\.arenaId/);
  assert.match(source, /registrationPhase:\s*\{\s*not:\s*"FINISHED"\s*\}/);
  assert.match(source, /aria-label="Selecionar evento"/);
});

test("games only offers categories from the selected active event", async () => {
  const source = await readSource("src", "app", "(app)", "jogos", "page.tsx");

  assert.match(source, /prisma\.tournamentCategory\.findMany/);
  assert.match(source, /tournamentId:\s*selectedTournament\.id/);
  assert.match(source, /active:\s*true/);
  assert.match(source, /aria-label="Selecionar categoria"/);
});

test("games routes score entry to the selected category workspace", async () => {
  const source = await readSource("src", "app", "(app)", "jogos", "page.tsx");

  assert.match(
    source,
    /href=\{`\/torneios\/\$\{selectedTournament\.id\}\/categorias\/\$\{selectedCategory\.id\}\?tab=games`\}/,
  );
});

test("games no longer loads the legacy global match workspace", async () => {
  const source = await readSource("src", "app", "(app)", "jogos", "page.tsx");

  assert.doesNotMatch(source, /getArenaDashboard/);
  assert.doesNotMatch(source, /generateMatchesAction/);
  assert.doesNotMatch(source, /activeTournament\.matches/);
});

test("tournaments keeps only games and rankings as sidebar children", async () => {
  const source = await readSource("src", "components", "layout", "nav-links.tsx");
  const tournamentChildren = source.match(
    /href: "\/torneios",[\s\S]*?children: \[([\s\S]*?)\]/,
  )?.[1] ?? "";

  assert.match(tournamentChildren, /href: "\/jogos", label: "Jogos"/);
  assert.match(tournamentChildren, /href: "\/torneios\/rankings", label: "Rankings"/);
  assert.doesNotMatch(tournamentChildren, /label: "Duplas"/);
  assert.doesNotMatch(tournamentChildren, /label: "Grupos"/);
});
