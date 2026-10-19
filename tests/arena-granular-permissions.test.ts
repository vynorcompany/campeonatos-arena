import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canPerformPermission, canViewModule } from "../src/lib/permissions";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("permissões de perfil da arena e portal não se confundem", () => {
  assert.equal(canViewModule("arena", "STAFF", "VIEWER", ["arena:portal"]), true);
  assert.equal(canPerformPermission("arena:portal", "STAFF", "VIEWER", ["arena:portal"]), true);
  assert.equal(canPerformPermission("arena:settings", "STAFF", "VIEWER", ["arena:portal"]), false);
  assert.equal(canPerformPermission("arena:portal", "STAFF", "VIEWER", ["arena:settings"]), false);
  assert.equal(canPerformPermission("arena:settings", "STAFF", "VIEWER", ["arena"]), true);
});

test("ações e páginas exigem a permissão específica da seção", () => {
  const arenaActions = read("src/lib/actions/arena.ts");
  const portalActions = read("src/lib/actions/client-portal.ts");
  const arenaPage = read("src/app/(app)/arena/page.tsx");
  assert.match(arenaActions, /updateAthletePortalSettingsAction[\s\S]*?requirePermission\("arena:portal"\)/);
  assert.match(arenaActions, /updateArenaProfileAction[\s\S]*?requirePermission\("arena:settings"\)/);
  assert.equal((portalActions.match(/requirePermission\("arena:portal"\)/g) ?? []).length, 11);
  assert.doesNotMatch(portalActions, /requireModuleEdit\("arena"\)/);
  assert.match(arenaPage, /activeSection === "portal"\) await requirePermission\("arena:portal", "view"\)/);
  assert.match(arenaPage, /activeSection === "data" \|\| activeSection === "courts"\) await requirePermission\("arena:settings", "view"\)/);
  assert.match(read("src/lib/actions/regulation.ts"), /requirePermission\("arena:settings"\)/);
});
