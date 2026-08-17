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
  assert.doesNotMatch(page, /<select[\s\S]*name="tournamentId"/);
});

test("sidebar parent sections only expand their submenus", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");

  assert.match(navigation, /className=\{`nav-link nav-link-parent/);
  assert.match(navigation, /onClick=\{\(\) => toggleItem\(item\.href\)\}/);
  assert.match(navigation, /nav-link-parent/);
});

test("comandas use a compact date trigger and a floating calendar modal", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/comandas/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/comanda.ts"), "utf8");
  const picker = readFileSync(resolve(process.cwd(), "src/components/comandas/commands-date-picker.tsx"), "utf8");

  assert.match(schema, /model Comanda \{/);
  assert.match(schema, /status\s+String\s+@default\("OPEN"\)/);
  assert.match(actions, /export async function createComandaAction/);
  assert.match(page, /Nova Comanda Avulsa/);
  assert.match(page, /CommandsDatePicker/);
  assert.match(picker, /commands-date-trigger/);
  assert.match(picker, /commands-calendar-modal/);
  assert.match(picker, /calendar-open-indicator/);
  assert.match(picker, /router\.push/);
});
