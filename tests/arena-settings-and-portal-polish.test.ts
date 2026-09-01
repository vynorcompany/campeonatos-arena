import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("arena settings includes the complete court configuration as a dedicated section", () => {
  const arenaPage = readFileSync(resolve(process.cwd(), "src/app/(app)/arena/page.tsx"), "utf8");
  const navigation = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");

  assert.match(arenaPage, /Quadras/);
  assert.match(arenaPage, /CourtConfigurationWorkspace/);
  assert.match(navigation, /href="\/arena\?section=courts"/);
});

test("athlete portal uses the arena logo as branding and reserves the circular avatar for the athlete", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(portal, /athlete-portal-arena-logo/);
  assert.match(portal, /athlete-portal-user-avatar/);
  assert.match(portal, /currentClient\.photoUrl/);
  assert.doesNotMatch(portal, /athlete-portal-mark/);
  assert.match(styles, /\.athlete-portal-user-avatar[^}]*border-radius:\s*50%/);
  assert.match(styles, /\.arena-logo-preview img[^}]*border-radius:\s*50%/);
  assert.match(styles, /\.athlete-portal-brand \.athlete-portal-arena-logo[^}]*border:\s*0/);
  assert.match(styles, /\.athlete-portal-brand \.athlete-portal-arena-logo[^}]*border-radius:\s*0/);
});

test("league category control stays compact and separated from its panel title", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(styles, /\.portal-league-category-picker[^}]*width:\s*fit-content/);
  assert.match(styles, /\.portal-league-category-picker[^}]*margin-top:\s*18px/);
});
