import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("tenant context can only select an arena the user belongs to", () => {
  const session = read("src/lib/auth/session.ts");
  const schema = read("prisma/schema.prisma");

  assert.match(session, /memberships\.find\(\(membership\) => membership\.arenaId === selectedArenaId\)/);
  assert.match(schema, /@@unique\(\[userId, arenaId\]\)/);
});

test("portal writes always enforce the active arena in their database predicates", () => {
  const actions = read("src/lib/actions/client-portal.ts");

  assert.match(actions, /portalAnnouncement\.updateMany\(\{ where: \{ id, arenaId: auth\.arenaId \}/);
  assert.match(actions, /calendarEvent\.updateMany\(\{ where: \{ id, arenaId: auth\.arenaId \}/);
  assert.match(actions, /portalEventPost\.create\(\{ data: \{ arenaId: auth\.arenaId/);
});

test("core tenant aggregates carry an arena ownership key", () => {
  const schema = read("prisma/schema.prisma");

  for (const model of ["Player", "Teacher", "Student", "Plan", "ClassGroup", "Court", "ScheduleOccurrence", "FinancialEntry", "Tournament", "PortalEventPost"]) {
    assert.match(schema, new RegExp(`model ${model} \\{[\\s\\S]*?arenaId\\s+String`));
  }
});
