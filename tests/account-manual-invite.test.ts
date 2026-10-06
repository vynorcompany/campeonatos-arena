import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { inviteArenaUserSchema } from "../src/lib/validators/user";
const require = createRequire(import.meta.url);
function fixture(options: { configured?: boolean; failEmail?: boolean; appUrl?: string; forbidden?: boolean; member?: boolean; invalidProfile?: boolean; recent?: number } = {}) {
  const tokens: any[] = [], deliveries: any[] = [];
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const mocks: Record<string, unknown> = {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/session": { requireArenaAccess: async () => ({ arenaId: "arena", arenaRole: options.forbidden ? "STAFF" : "ADMIN", systemRole: "VIEWER" }) },
    "@/lib/auth/account-email": { accountEmailIsConfigured: () => options.configured ?? false, sendAccountEmail: async (...args: any[]) => { deliveries.push(args); if (options.failEmail) throw new Error("Provider unavailable"); } },
    "@/lib/auth/account-tokens": { createAccountToken: async (data: any) => { tokens.push(data); return { token: "a".repeat(64), record: { id: "invite" } }; } },
    "@/lib/env": { env: { appUrl: options.appUrl } },
    "@/lib/validators/user": { inviteArenaUserSchema },
    "@/lib/prisma": { prisma: {
      permissionProfile: { findFirst: async ({ where }: any) => where.arenaId === "arena" && where.active && !options.invalidProfile ? { id: "profile" } : null },
      user: { findUnique: async () => options.member ? { id: "user", memberships: [{ id: "membership" }] } : null },
      arena: { findUnique: async () => ({ name: "Arena de teste" }) },
      accountActionToken: { count: async () => options.recent ?? 0, delete: async () => { throw new Error("Invite must not be discarded"); } },
    } },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/account-access.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { exports, Date, URL, URLSearchParams, require: (name: string) => name in mocks ? mocks[name] : require(name) });
  const form = new FormData(); form.set("name", "Pessoa de Teste"); form.set("email", "USER@example.invalid"); form.set("permissionProfileId", "profile");
  return { invite: () => exports.inviteArenaUserAction({ error: null, success: null }, form), tokens, deliveries };
}

test("administrators generate scoped, expiring invitations without email or APP_URL", async () => {
  const f = fixture(); const result = await f.invite();
  assert.equal(result.error, null); assert.match(result.invitationUrl, /^\/convite\?token=[a-f0-9]{64}$/);
  assert.equal(f.deliveries.length, 0); assert.equal(f.tokens[0].email, "user@example.invalid");
  assert.equal(f.tokens[0].hoursValid, 48); assert.equal(f.tokens[0].arenaId, "arena"); assert.equal(f.tokens[0].profileId, "profile"); assert.equal(f.tokens[0].arenaRole, "STAFF");
});
test("configured email preserves the normal delivery flow", async () => {
  const f = fixture({ configured: true, appUrl: "https://arena.example.invalid" }); const result = await f.invite();
  assert.equal(f.deliveries.length, 1); assert.equal(result.invitationUrl, undefined); assert.equal(result.error, null);
});
test("email delivery failure retains the invitation and returns a manual link", async () => {
  const f = fixture({ configured: true, failEmail: true, appUrl: "https://arena.example.invalid" }); const result = await f.invite();
  assert.equal(result.error, null); assert.match(result.success, /não pôde ser enviado/); assert.match(result.invitationUrl, /^https:\/\/arena.example.invalid\/convite\?token=/);
  assert.equal(f.tokens.length, 1);
});
test("manual invitations retain permission, tenant profile, duplicate and rate limit checks", async () => {
  for (const options of [{ forbidden: true }, { invalidProfile: true }, { member: true }, { recent: 3 }]) {
    const f = fixture(options); const result = await f.invite(); assert.ok(result.error); assert.equal(result.invitationUrl, undefined); assert.equal(f.tokens.length, 0);
  }
});
