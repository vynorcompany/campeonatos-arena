import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("Portal reconhece atleta inscrito em Liga ainda não encerrada", () => {
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-league-portal.ts"), "utf8");

  assert.match(service, /players:\s*\{\s*some:\s*\{\s*playerId\s*\}\s*\}/);
  assert.match(service, /format:\s*"LEAGUE"/);
  assert.match(service, /status:\s*"PUBLISHED"/);
});
