import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("arena settings separates arena data, athlete portal and user management into sidebar sections", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/arena/page.tsx"), "utf8");

  assert.match(page, /searchParams/);
  assert.match(page, /Dados da Arena/);
  assert.match(page, /Portal do Atleta/);
  assert.match(page, /Usuários/);
  assert.match(page, /ArenaUsersManagement/);
});

test("arena users management remains reusable and restricted to administrators", () => {
  const usersPage = readFileSync(resolve(process.cwd(), "src/app/(app)/usuarios/page.tsx"), "utf8");
  const workspace = resolve(process.cwd(), "src/components/users/arena-users-management.tsx");

  assert.match(usersPage, /requireRole\("ADMIN"\)/);
  assert.match(usersPage, /ArenaUsersManagement/);
  assert.doesNotThrow(() => readFileSync(workspace, "utf8"));
});
