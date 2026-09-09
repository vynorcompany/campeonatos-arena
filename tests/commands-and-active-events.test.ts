import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("active events are listed before their categories are selected", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/jogos/page.tsx"), "utf8");
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");

  assert.match(navigation, /label: "Eventos ativos"/);
  assert.match(page, /Entrar no evento/);
  assert.match(page, /Novo evento/);
  assert.match(page, /Gerenciar evento/);
  assert.match(page, /Escolha uma categoria/);
  assert.doesNotMatch(page, /title="Eventos em operação"/);
  assert.doesNotMatch(page, /description="Selecione um evento para ver as categorias disponíveis ou gerencie sua estrutura\."/);
  assert.doesNotMatch(page, /<select[\s\S]*name="tournamentId"/);
});

test("clients can be opened from the list and edited in a modal", () => {
  const workspace = readFileSync(resolve(process.cwd(), "src/components/players/client-management-workspace.tsx"), "utf8");

  assert.match(workspace, /updatePlayerAction/);
  assert.match(workspace, /setEditingClient\(client\)/);
  assert.match(workspace, /aria-label="Editar cliente"/);
  assert.match(workspace, /Salvar alterações/);
});

test("sidebar parent sections only expand their submenus", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  const shell = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(navigation, /className=\{`nav-link nav-link-parent/);
  assert.match(navigation, /onClick=\{\(\) => toggleItem\(item\.href\)\}/);
  assert.match(navigation, /nav-link-parent/);
  assert.match(navigation, /const activeExpandableItems/);
  assert.match(navigation, /const isOpen = openItems\.has\(item\.href\)/);
  assert.match(navigation, /\}, \[pathname\]\);/);
  assert.match(styles, /\.app-shell \.sidebar \{[^}]*linear-gradient\(145deg, #062b57/);
  assert.match(styles, /\.app-shell \.nav-link-active \{[^}]*#0868e5/);
  assert.match(shell, /style=\{\{ backgroundColor: "#062b57", backgroundImage: "radial-gradient\(circle at 12% 6%/);
});

test("comandas use a compact date trigger and a floating calendar modal", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/comanda.ts"), "utf8");
  const picker = readFileSync(resolve(process.cwd(), "src/components/comandas/commands-date-picker.tsx"), "utf8");

  assert.match(schema, /model Comanda \{/);
  assert.match(schema, /model ComandaItem \{/);
  const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20260817140000_add_comanda_demo_product/migration.sql"), "utf8");
  assert.match(migration, /Produto de teste · Água 500 ml/);
  assert.match(schema, /status\s+String\s+@default\("OPEN"\)/);
  assert.match(actions, /export async function createComandaAction/);
  assert.match(actions, /export async function addComandaProductAction/);
  assert.match(actions, /export async function updateComandaItemQuantityAction/);
  assert.match(actions, /export async function finishComandaAction/);
  assert.match(page, /Nova Comanda Avulsa/);
  assert.match(page, /CommandsDatePicker/);
  assert.match(picker, /commands-date-trigger/);
  assert.match(picker, /commands-calendar-modal/);
  assert.match(picker, /calendar-open-indicator/);
  assert.match(picker, /router\.push/);
});

test("comanda editing opens before checkout and client selection supports typing", () => {
  const card = readFileSync(resolve(process.cwd(), "src/components/comandas/command-card.tsx"), "utf8");
  const modal = readFileSync(resolve(process.cwd(), "src/components/comandas/new-command-modal.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(card, /setDetailsOpen\(true\)/);
  assert.match(card, /Itens da comanda/);
  assert.match(card, /Finalizar comanda/);
  assert.match(styles, /grid-template-columns: repeat\(auto-fill, minmax\(210px, 280px\)\)/);
  assert.match(modal, /Buscar cliente/);
  assert.match(modal, /matchingPlayers/);
  assert.doesNotMatch(modal, /<select name="playerId"/);
});

test("agenda generates reservation labels without a manual name field", () => {
  const dialog = readFileSync(resolve(process.cwd(), "src/components/agenda-slot-dialog.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");

  assert.match(dialog, /\$\{bookingTypeName\} ·/);
  assert.doesNotMatch(dialog, /Nome da reserva/);
  assert.match(actions, /let bookingTitle/);
  assert.match(actions, /classGroup\.name/);
});
