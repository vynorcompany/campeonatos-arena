import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

test("criação de Liga exige e persiste o nível A ou B da categoria", () => {
  const form = readFileSync(resolve(process.cwd(), "src/components/tournaments/category-competition-form.tsx"), "utf8");
  const action = readFileSync(resolve(process.cwd(), "src/lib/actions/category-competition.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "src/lib/validators/category-competition.ts"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/category-competition.ts"), "utf8");

  assert.match(form, /name="leagueTier"/);
  assert.match(action, /leagueTier:\s*formData\.get\("leagueTier"\)/);
  assert.match(schema, /leagueTier:\s*z\.enum\(\["A", "B"\]\)/);
  assert.match(service, /leagueTier:\s*input\.format === "LEAGUE" \? input\.leagueTier \?\? "" : ""/);
  assert.match(service, /\\bLIGA\\b\.\*\\bB\\b/);
});

test("premiação é salva no ciclo de Liga aberto, não no mês do calendário", () => {
  const action = readFileSync(resolve(process.cwd(), "src/lib/actions/category-competition.ts"), "utf8");
  const page = readFileSync(resolve(process.cwd(), "src/app/(app)/torneios/[tournamentId]/categorias/[categoryId]/page.tsx"), "utf8");

  assert.match(action, /leagueCycle\.findFirst\([\s\S]*status:\s*"OPEN"/);
  assert.match(action, /where:\s*\{ id:\s*openCycle\.id \}/);
  assert.match(page, /find\(\(cycle\) => cycle\.status === "OPEN"\)\?\.prizeDescription/);
});
