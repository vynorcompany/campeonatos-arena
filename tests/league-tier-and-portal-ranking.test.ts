import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("edição de cliente preserva a Liga A ou B selecionada", () => {
  const action = readFileSync(resolve(process.cwd(), "src/lib/actions/tournament.ts"), "utf8");

  assert.match(action, /updatePlayerSchema\.safeParse\(\{[\s\S]*leagueTier:\s*formData\.get\("leagueTier"\)/);
});

test("ranking do Portal inclui Ligas ativas antes da publicação do ciclo", () => {
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-standings.ts"), "utf8");
  const categoryRecordsQuery = service.slice(service.indexOf("prisma.categoryCompetition.findMany({"), service.indexOf("prisma.categoryCompetition.findMany({", service.indexOf("prisma.categoryCompetition.findMany({") + 1));

  assert.match(categoryRecordsQuery, /format:\s*"LEAGUE",\s*status:\s*\{\s*not:\s*"FINISHED"\s*\}/);
});
