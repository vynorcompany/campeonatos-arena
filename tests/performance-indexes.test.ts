import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("operational queries have compound indexes for agenda, command and receivable filters", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  assert.match(schema, /model Comanda \{[\s\S]*@@index\(\[arenaId, status, openedAt\]\)/);
  assert.match(schema, /model Sale \{[\s\S]*@@index\(\[arenaId, status, createdAt\]\)/);
  assert.match(schema, /model FinancialEntry \{[\s\S]*@@index\(\[arenaId, status, dueDate\]\)/);
});
