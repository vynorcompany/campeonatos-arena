import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("client accounts use a dedicated player session linked to an existing phone", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/player-auth.ts"), "utf8");
  const session = readFileSync(resolve(process.cwd(), "src/lib/auth/player-session.ts"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/public-client-auth-form.tsx"), "utf8");

  assert.match(schema, /model PlayerAccount \{/);
  assert.match(schema, /model PlayerSession \{/);
  assert.match(schema, /playerId\s+String\s+@unique/);
  assert.match(schema, /@@unique\(\[arenaId, phone\]\)/);
  assert.match(actions, /normalizePhone/);
  assert.doesNotMatch(actions, /export function normalizePhone/);
  assert.match(actions, /registerPublicClientAction/);
  assert.match(actions, /loginPublicClientAction/);
  assert.match(session, /getPublicPlayerAuth/);
  assert.match(form, /Criar conta/);
  assert.match(form, /Telefone/);
});

test("online bookings create arena notifications that the team can read in the shell", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const calendar = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const shell = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");
  const notification = resolve(process.cwd(), "src/components/layout/arena-notification-bell.tsx");

  assert.match(schema, /model ArenaNotification \{/);
  assert.match(calendar, /arenaNotification\.create/);
  assert.ok(existsSync(notification));
  assert.match(shell, /ArenaNotificationBell/);
});
