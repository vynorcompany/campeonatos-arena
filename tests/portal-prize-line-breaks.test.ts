import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("premiação da Liga preserva as quebras de linha salvas no Portal do Atleta", () => {
  const portal = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(portal, /portal-league-prize-description/);
  assert.match(styleRules("portal-league-prize-description"), /white-space:\s*pre-line/);
});
