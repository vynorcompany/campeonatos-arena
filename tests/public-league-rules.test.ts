import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("regras de Ligas ativas chegam ao Portal sem depender da visibilidade pública da categoria", () => {
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-standings.ts"), "utf8");

  assert.match(service, /leagueRuleRecords/);
  assert.match(service, /format:\s*"LEAGUE"/);
  assert.match(service, /status:\s*\{\s*not:\s*"FINISHED"\s*\}/);
  assert.match(service, /const leagueRules = Array\.from\(new Map\(leagueRuleRecords/);
});
