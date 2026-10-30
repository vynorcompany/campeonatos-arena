import { readFile } from "./helpers/style-source";
import assert from "node:assert/strict";
import test from "node:test";

import path from "node:path";

const workspaceRoot = process.cwd();

async function readSource(...segments: string[]) {
  return readFile(path.join(workspaceRoot, ...segments), "utf8");
}

test("games starts with arena-scoped active events in a list", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.match(source, /prisma\.tournament\.findMany/);
  assert.match(source, /arenaId:\s*auth\.arenaId/);
  assert.match(source, /registrationPhase:[^\n]*not:\s*"FINISHED"/);
  assert.match(source, /Categorias/);
  assert.doesNotMatch(source, /aria-label="Selecionar evento"/);
});

test("games offers categories only after selecting an active event", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.match(source, /selectedTournament\.categories/);
  assert.match(source, /active:\s*true/);
  assert.match(source, /Escolha uma categoria/);
  assert.doesNotMatch(source, /aria-label="Selecionar categoria"/);
});

test("games routes the selected category to its workspace", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.match(source, /href=\{`\/torneios\/\$\{selectedTournament\.id\}\/categorias\/\$\{category\.id\}\$\{canManageTournaments \? "" : "\?tab=games"\}`\}/);
  assert.match(source, /Abrir categoria/);
  assert.match(source, /Lançar resultados/);
});

test("games permits match consultation without granting tournament management", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.match(source, /canViewModule\("tournaments"/);
  assert.match(source, /canPerformPermission\("tournaments:manage", auth\.arenaRole, auth\.systemRole, auth\.editPermissions\)/);
  assert.match(source, /canViewModule\("matches"/);
  assert.match(source, /if \(!canViewTournaments && !canReadMatches\) notFound\(\)/);
  assert.match(source, /tournament: \{ arenaId: auth\.arenaId \}/);
  assert.match(source, /Programação e placares/);
  assert.match(source, /canManageTournaments \? <Link href=\{`\/torneios\/\$\{selectedTournament\.id\}`\}/);
  assert.doesNotMatch(source, /requireModuleView\("matches"\)/);
});

test("games no longer loads the legacy global match workspace", async () => {
  const source = await readSource("src", "app", "(app)", "torneios", "page.tsx");

  assert.doesNotMatch(source, /getArenaDashboard/);
  assert.doesNotMatch(source, /generateMatchesAction/);
  assert.doesNotMatch(source, /activeTournament\.matches/);
});

test("tournaments keeps only games and rankings as sidebar children", async () => {
  const source = await readSource("src", "components", "layout", "nav-links.tsx");
  const tournamentChildren = source.match(
    /href: "\/torneios",[\s\S]*?children: canSee\("tournaments"\) \? \[([\s\S]*?)\]/,
  )?.[1] ?? "";

  assert.match(tournamentChildren, /href: "\/torneios", label: "Eventos ativos"/);
  assert.match(tournamentChildren, /href: "\/torneios\/rankings", label: "Rankings"/);
  assert.doesNotMatch(tournamentChildren, /label: "Duplas"/);
  assert.doesNotMatch(tournamentChildren, /label: "Grupos"/);
});

test("tournament parent opens games for a matches-only profile", async () => {
  const source = await readSource("src", "components", "layout", "nav-links.tsx");
  assert.match(source, /href: "\/torneios"/);
  assert.match(source, /children: canSee\("tournaments"\) \? \[[\s\S]*?\] : undefined/);
});

test("games breadcrumb follows the visible permission, not an inaccessible tournament module", async () => {
  const shell = await readSource("src", "components", "layout", "app-shell.tsx");
  const breadcrumb = await readSource("src", "components", "layout", "page-breadcrumb.tsx");
  assert.match(shell, /WorkspaceBreadcrumb canViewTournaments=\{visibleModules\.includes\("tournaments"\)\}/);
  assert.match(breadcrumb, /path\.startsWith\("\/jogos"\)[\s\S]*?canViewTournaments[\s\S]*?section="Jogos" current="Programação e placares"/);
});
