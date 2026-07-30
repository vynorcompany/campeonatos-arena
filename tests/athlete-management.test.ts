import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const athletePolicyPath = path.join(process.cwd(), "src", "lib", "athlete-management.ts");

test("explains why an athlete with tournament history cannot be deleted", async () => {
  assert.ok(existsSync(athletePolicyPath), "The athlete deletion policy must exist.");

  const { getAthleteDeletionRestriction } = await import("../src/lib/athlete-management");

  assert.equal(
    getAthleteDeletionRestriction({ tournamentEntries: 1, pairAppearances: 0 }),
    "Este atleta possui histórico em torneios e não pode ser excluído. Inative-o para preservar os registros."
  );
});

test("allows deletion when the athlete has no tournament history", async () => {
  assert.ok(existsSync(athletePolicyPath), "The athlete deletion policy must exist.");

  const { getAthleteDeletionRestriction } = await import("../src/lib/athlete-management");

  assert.equal(getAthleteDeletionRestriction({ tournamentEntries: 0, pairAppearances: 0 }), null);
});

test("deletes athletes through the guarded delete action", () => {
  const actionsSource = readFileSync(path.join(process.cwd(), "src", "lib", "actions", "tournament.ts"), "utf8");

  assert.match(actionsSource, /export async function deleteAthleteAction/);
  assert.match(actionsSource, /getAthleteDeletionRestriction/);
});

test("keeps athlete creation collapsed until the add button is pressed", () => {
  const createPanelPath = path.join(process.cwd(), "src", "components", "players", "athlete-create-panel.tsx");
  assert.ok(existsSync(createPanelPath), "The collapsible athlete creation panel must exist.");

  const source = readFileSync(createPanelPath, "utf8");
  assert.match(source, /useState\(false\)/);
  assert.match(source, /Adicionar novo atleta/);
  assert.match(source, /isOpen \? <PlayerForm \/> : null/);
});

test("offers a single discreet action menu with a protected delete option", () => {
  const source = readFileSync(path.join(process.cwd(), "src", "components", "players", "player-actions-cell.tsx"), "utf8");

  assert.match(source, /deleteAthleteAction/);
  assert.match(source, />\s*Editar\s*</);
  assert.match(source, />\s*Inativar\s*</);
  assert.match(source, />\s*Excluir\s*</);
  assert.match(source, /aria-label={`Ações de \$\{playerName\}`}/);
});
