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
