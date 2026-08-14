import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("sidebar keeps only the approved arena workspaces", () => {
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/nav-links.tsx"), "utf8");
  assert.match(navigation, /label: "Dashboard"/);
  assert.match(navigation, /label: "Torneios"/);
  assert.match(navigation, /label: "Agenda de quadras"[\s\S]*children: \[\{ href: "\/agenda\/configuracao", label: "Configuração" \}\]/);
  assert.match(navigation, /label: "Tela da TV"/);
  assert.match(navigation, /label: "Atletas"/);
  assert.match(navigation, /label: "Configurações"/);
  assert.doesNotMatch(navigation, /title: "Gestão"/);
  assert.doesNotMatch(navigation, /title: "Financeiro"/);
  assert.doesNotMatch(navigation, /Suporte\/Ajuda/);
});
