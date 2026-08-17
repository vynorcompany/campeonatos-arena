import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("sidebar exposes the compact arena workspaces and keeps settings near sign out", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  const shell = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");
  assert.match(navigation, /label: "Dashboard"/);
  assert.match(navigation, /label: "Torneios"/);
  assert.match(navigation, /label: "Grade de Horários"/);
  assert.doesNotMatch(navigation, /href: "\/agenda\/configuracao", label: "Configuração"/);
  assert.match(navigation, /label: "Tela da TV"/);
  assert.match(navigation, /label: "Comandas"/);
  assert.match(navigation, /label: "Clientes"/);
  assert.doesNotMatch(navigation, /title: "Administração"/);
  assert.match(shell, /href="\/arena"[\s\S]*Configurações[\s\S]*Sair/);
  assert.doesNotMatch(navigation, /title: "Gestão"/);
  assert.doesNotMatch(navigation, /title: "Financeiro"/);
  assert.doesNotMatch(navigation, /Suporte\/Ajuda/);
});
