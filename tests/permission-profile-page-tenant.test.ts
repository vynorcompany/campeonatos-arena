import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("perfil de outra arena responde como página não encontrada", () => {
  const page = readFileSync(new URL("../src/app/(app)/arena/perfis/[profileId]/page.tsx", import.meta.url), "utf8");

  assert.match(page, /permissionProfile\.findFirst\(\{ where: \{ id: params\.profileId, arenaId: auth\.arenaId \}/);
  assert.match(page, /if \(!profile\) notFound\(\)/);
  assert.doesNotMatch(page, /permissionProfile\.findFirstOrThrow\(/);
});
