import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canManageWhatsApp, canSendWhatsApp, defaultArenaPermissionProfiles } from "@/lib/permissions";

test("WhatsApp reply permission does not grant conversation administration", () => {
  assert.equal(canSendWhatsApp("STAFF", "VIEWER", ["support:view"]), false);
  assert.equal(canSendWhatsApp("STAFF", "VIEWER", ["support:whatsapp:send"]), true);
  assert.equal(canManageWhatsApp("STAFF", "VIEWER", ["support:whatsapp:send"]), false);
  assert.equal(canManageWhatsApp("STAFF", "VIEWER", ["support:whatsapp:manage"]), true);
  assert.equal(canSendWhatsApp("OWNER", "VIEWER", []), true);
  assert.equal(canSendWhatsApp("VIEWER", "VIEWER", []), false);
});

test("Balcão may answer WhatsApp without managing the inbox", () => {
  const profile = defaultArenaPermissionProfiles.find((item) => item.name === "Balcão");
  assert.ok(profile);
  assert.equal(canSendWhatsApp("STAFF", "VIEWER", [...profile.editPermissions]), true);
  assert.equal(canManageWhatsApp("STAFF", "VIEWER", [...profile.editPermissions]), false);
});

test("legacy Administrator profile receives only WhatsApp sending permission", () => {
  const sql = readFileSync(new URL("../prisma/migrations/20261013231000_whatsapp_send_permission/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /"name" = 'Administrador'/);
  assert.match(sql, /'support:view' = ANY\("viewPermissions"\)/);
  assert.match(sql, /array_append\("editPermissions", 'support:whatsapp:send'\)/);
  assert.doesNotMatch(sql, /array_append\("editPermissions", 'support'\)/);
});
