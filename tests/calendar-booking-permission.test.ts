import assert from "node:assert/strict";
import test from "node:test";
import { canPerformPermission } from "../src/lib/permissions";

test("permissões granulares da agenda não concedem cancelamento ou liberação por outra ação", () => {
  assert.equal(canPerformPermission("calendar:booking:edit", "STAFF", "VIEWER", ["calendar:booking:create"]), false);
  assert.equal(canPerformPermission("calendar:booking:create", "STAFF", "VIEWER", ["calendar:booking:edit"]), false);
  assert.equal(canPerformPermission("calendar:booking:cancel", "STAFF", "VIEWER", ["calendar:booking:create"]), false);
  assert.equal(canPerformPermission("calendar:recurrence:release", "STAFF", "VIEWER", ["calendar:booking:cancel"]), false);
  assert.equal(canPerformPermission("calendar:booking:cancel", "STAFF", "VIEWER", ["calendar:booking:cancel"]), true);
  assert.equal(canPerformPermission("calendar:recurrence:release", "STAFF", "VIEWER", ["calendar:recurrence:release"]), true);
  assert.equal(canPerformPermission("calendar:booking:cancel", "STAFF", "VIEWER", ["calendar"]), true);
  assert.equal(canPerformPermission("calendar:booking:cancel", "OWNER", "VIEWER", []), true);
  assert.equal(canPerformPermission("calendar:booking:cancel", null, "ADMIN", []), true);
});
