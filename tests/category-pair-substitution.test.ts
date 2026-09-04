import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("league pairs support audited athlete substitutions without resetting match results", async () => {
  const [schema, validators, service, actions, panel, pairForm] = await Promise.all([
    readFile("prisma/schema.prisma", "utf8"),
    readFile("src/lib/validators/category-competition.ts", "utf8"),
    readFile("src/lib/services/category-competition.ts", "utf8"),
    readFile("src/lib/actions/category-competition.ts", "utf8"),
    readFile("src/components/tournaments/category-registration-panel.tsx", "utf8"),
    readFile("src/components/tournaments/category-pair-form.tsx", "utf8"),
  ]);

  assert.match(schema, /model CategoryPairSubstitution/);
  assert.match(schema, /CategoryPair[^]*substitutions\s+CategoryPairSubstitution\[\]/);
  assert.match(validators, /replaceCategoryPairPlayerSchema/);
  assert.match(service, /export async function replaceCategoryPairPlayer/);
  assert.match(service, /status:\s*categoryCompetitionStatus\.PUBLISHED/);
  assert.match(service, /categoryPairPlayer\.update/);
  assert.match(service, /categoryPairSubstitution\.create/);
  assert.doesNotMatch(service, /replaceCategoryPairPlayer[\s\S]{0,5000}categoryMatch\.deleteMany/);
  assert.match(actions, /replaceCategoryPairPlayerAction/);
  assert.match(panel, /replaceCategoryPairPlayerAction/);
  assert.match(panel, /SafeActionForm/);
  assert.match(panel, /AthleteSearchField/);
  assert.match(pairForm, /export function AthleteSearchField/);
});
