import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(workspaceRoot, "prisma", "schema.prisma");

test("schema defines the category competition boundary", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /model CategoryCompetition\b/);
  assert.match(schema, /competition\s+CategoryCompetition\?/);
  assert.match(schema, /enum CompetitionFormat\b/);
  assert.match(schema, /type\s+RankingType\s+@default\(PAIR\)/);
});

test("schema keeps competition data scoped to each category", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum CompetitionFormat\s*\{\s*LEAGUE\s+THREE_GROUPS\s+FOUR_GROUPS\s+SIMPLE\s*\}/s);
  assert.match(schema, /enum RankingType\s*\{\s*INDIVIDUAL\s+PAIR\s*\}/s);
  assert.match(schema, /class\s+String\s+@default\(""\)/);
  assert.match(schema, /gender\s+String\s+@default\(""\)/);
  assert.match(schema, /type\s+RankingType\s+@default\(PAIR\)/);
  assert.match(schema, /categoryId\s+String\s+@unique/);
  assert.match(schema, /format\s+CompetitionFormat/);
  assert.match(schema, /feedsGeneralRanking\s+Boolean\s+@default\(false\)/);
  assert.match(schema, /model CategoryPair\b/);
  assert.match(schema, /model CategoryGroup\b/);
  assert.match(schema, /model CategoryMatch\b/);
  assert.match(schema, /competition\s+CategoryCompetition\s+@relation\([^\n]*onDelete:\s*Cascade/);
  assert.match(schema, /competition\s+CategoryCompetition\?\s+@relation\([^\n]*onDelete:\s*Cascade/);
});

test("schema prevents cross-competition ownership references", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /@@unique\(\[id, categoryId\]\)/);
  assert.match(schema, /@@unique\(\[id, competitionId\]\)/);
  assert.match(schema, /competition\s+CategoryCompetition\?\s+@relation\(fields:\s*\[competitionId, categoryId\],\s*references:\s*\[id, categoryId\]/);
  assert.match(schema, /group\s+CategoryGroup\?\s+@relation\(fields:\s*\[groupId, competitionId\],\s*references:\s*\[id, competitionId\]/);
  assert.match(schema, /homePair\s+CategoryPair\?\s+@relation\("CategoryHomePair",\s*fields:\s*\[homePairId, competitionId\],\s*references:\s*\[id, competitionId\]/);
});
