import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const actions = readFileSync(resolve(root, "src/lib/actions/tournament.ts"), "utf8");
const workspace = readFileSync(resolve(root, "src/components/players/client-management-workspace.tsx"), "utf8");

test("inativação de cliente preserva o cadastro e expõe a ação no modal", () => {
  assert.match(actions, /export async function archivePlayerAction/);
  assert.match(actions, /data:\s*\{\s*active:\s*false\s*\}/);
  assert.match(workspace, /archivePlayerAction/);
  assert.match(workspace, /Excluir cliente/);
});

test("clientes inativos podem ser reativados pelo mesmo modal", () => {
  assert.match(actions, /export async function reactivatePlayerAction/);
  assert.match(actions, /data:\s*\{\s*active:\s*true\s*\}/);
  assert.match(workspace, /Reativar cliente/);
});

test("mesclagem mantém o acesso do cliente principal quando ambos possuem portal", () => {
  const managementActions = readFileSync(resolve(root, "src/lib/actions/client-management.ts"), "utf8");
  assert.doesNotMatch(managementActions, /if \(primary\.account && duplicate\.account\) throw new Error/);
  assert.match(managementActions, /playerAccount\.delete/);
});

test("cliente mesclado fica fora de todas as listas sem perder o histórico técnico", () => {
  const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
  const page = readFileSync(resolve(root, "src/app/(app)/jogadores/page.tsx"), "utf8");
  const managementActions = readFileSync(resolve(root, "src/lib/actions/client-management.ts"), "utf8");

  assert.match(schema, /mergedIntoPlayerId\s+String\?/);
  assert.match(managementActions, /mergedIntoPlayerId:\s*primary\.id/);
  assert.match(page, /mergedIntoPlayerId:\s*null/);
});
