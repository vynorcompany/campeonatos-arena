import assert from "node:assert/strict";
import test from "node:test";
import { isMigratedPermissionProfile, permissionProfileLabel } from "../src/lib/permission-profile-label";

test("perfil migrado não expõe identificador interno na interface", () => {
  assert.equal(permissionProfileLabel("Migrado · OWNER cmva9tptt0006l852g9kyu2qm"), "Acesso legado · Proprietário");
  assert.equal(permissionProfileLabel("Migrado · STAFF member-123"), "Acesso legado · Colaborador");
  assert.equal(permissionProfileLabel("Financeiro"), "Financeiro");
  assert.equal(isMigratedPermissionProfile("Migrado · OWNER member-123"), true);
  assert.equal(isMigratedPermissionProfile("Financeiro"), false);
});
