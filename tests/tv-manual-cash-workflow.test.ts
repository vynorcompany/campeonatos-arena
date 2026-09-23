import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("TV manual games stay in the modal and enforce three games on the server", () => {
  const modal = source("../src/components/tv-match-source-fields.tsx");
  const action = source("../src/lib/actions/upcoming-match.ts");
  const oldPage = source("../src/app/(app)/proximos-jogos/page.tsx");
  assert.match(modal, /updateManualUpcomingMatchAction/);
  assert.match(modal, /deleteManualUpcomingMatchAction/);
  assert.doesNotMatch(modal, /Ver e editar todos/);
  assert.match(action, /if \(matchCount >= 3\)/);
  assert.match(oldPage, /redirect\("\/proximos-jogos\/apresentacao"\)/);
});

test("cash reports use recorded registers and POS movements", () => {
  const report = source("../src/app/(app)/relatorios/[relatorio]/page.tsx");
  const pos = source("../src/lib/actions/pos.ts");
  assert.match(report, /prisma\.cashRegister\.findMany/);
  assert.match(report, /register\.movements/);
  assert.match(pos, /referenceDate: cashReferenceDate\(\)/);
});
