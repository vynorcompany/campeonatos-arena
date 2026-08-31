import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

test("cliente pode ser vinculado a um professor no mesmo cadastro", () => {
  const schema = read("prisma/schema.prisma");
  const action = read("src/lib/actions/tournament.ts");

  assert.match(schema, /model Player \{[\s\S]*email\s+String\s+@default\(""\)[\s\S]*teacher\s+Teacher\?/);
  assert.match(schema, /model Teacher \{[\s\S]*playerId\s+String\?\s+@unique[\s\S]*player\s+Player\?/);
  assert.match(action, /isTeacher:\s*formData\.get\("isTeacher"\)/);
  assert.match(action, /tx\.teacher\.upsert/);
});

test("formulário de cliente remove cadastro redundante de aluno e oferece papel de professor", () => {
  const form = read("src/components/forms/player-form.tsx");
  const workspace = read("src/components/players/client-management-workspace.tsx");

  assert.doesNotMatch(form, /createStudent/);
  assert.doesNotMatch(form, /Classe/);
  assert.match(form, /Gênero[\s\S]*<select/);
  assert.match(workspace, /name="isTeacher"/);
});

test("Portal do Atleta disponibiliza edição do próprio perfil", () => {
  const portal = read("src/components/tournaments/public-standings.tsx");
  const action = read("src/lib/actions/public-player-profile.ts");

  assert.match(portal, /Meu perfil/);
  assert.match(portal, /PublicPlayerProfile/);
  assert.match(action, /updatePublicPlayerProfileAction/);
  assert.match(action, /requirePublicPlayerAuth/);
});
