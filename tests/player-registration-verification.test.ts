import { legalVersion } from "../src/lib/legal/version";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/actions/player-auth.ts", import.meta.url), "utf8");

function fixture(options: { existingAccount?: boolean } = {}) {
  const codes: Array<{ id: string; arenaId: string; phone: string; purpose: string; codeHash: string; attempts: number; usedAt: Date | null; expiresAt: Date; createdAt: Date }> = [];
  const accounts: Array<{ id: string; arenaId: string; phone: string; playerId: string; identityId: string; passwordHash: string; termsVersion?: string; privacyNoticeVersion?: string; termsAcceptedAt?: Date }> = [];
  if (options.existingAccount) accounts.push({ id: "existing-account", arenaId: "arena-a", phone: "11999990000", playerId: "player-a", identityId: "identity-a", passwordHash: "old-hash" });
  const sent: string[] = [];
  const sessions: string[] = [];
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  const matches = (code: (typeof codes)[number], where: any) =>
    (!where.id || code.id === where.id) && (!where.arenaId || (typeof where.arenaId === "string" ? code.arenaId === where.arenaId : where.arenaId.in.includes(code.arenaId))) &&
    (!where.phone || code.phone === where.phone) && (!where.purpose || code.purpose === where.purpose) &&
    (!where.codeHash || code.codeHash === where.codeHash) &&
    (where.usedAt !== null || code.usedAt === null) &&
    (!where.attempts || code.attempts < where.attempts.lt) &&
    (!where.expiresAt || code.expiresAt > where.expiresAt.gt);
  const prisma: any = {
    arena: { findUnique: async ({ where }: any) => where.slug === "arena-teste" ? { id: "arena-a" } : null },
    playerAccount: {
      findUnique: async ({ where }: any) => { const account = accounts.find((item) => item.arenaId === where.arenaId_phone.arenaId && item.phone === where.arenaId_phone.phone); return account ? { ...account, player: { active: true } } : null; },
      findMany: async () => accounts,
      create: async ({ data }: any) => { const account = { id: `account-${accounts.length + 1}`, ...data }; accounts.push(account); return account; },
      updateMany: async ({ data }: any) => { for (const account of accounts) account.passwordHash = data.passwordHash; },
    },
    athleteIdentity: { findUnique: async () => null, create: async () => ({ id: "identity-a" }), update: async () => ({ id: "identity-a" }) },
    player: { findMany: async () => [], create: async () => ({ id: "player-a" }) },
    playerSession: { deleteMany: async () => ({ count: 0 }) },
    playerVerificationCode: {
      findFirst: async ({ where }: any) => codes.filter((code) => matches(code, where)).at(-1) ?? null,
      count: async () => codes.length,
      updateMany: async ({ where, data }: any) => { const selected = codes.filter((code) => matches(code, where)); for (const code of selected) { if (data.usedAt) code.usedAt = data.usedAt; if (data.attempts?.increment) code.attempts += data.attempts.increment; } return { count: selected.length }; },
      create: async ({ data }: any) => { const code = { id: `code-${codes.length + 1}`, attempts: 0, usedAt: null, createdAt: new Date(), ...data }; codes.push(code); return code; },
      delete: async ({ where }: any) => { const index = codes.findIndex((code) => code.id === where.id); if (index >= 0) codes.splice(index, 1); },
    },
  };
  prisma.$transaction = async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma);
  const mocks: Record<string, unknown> = {
    "@/lib/legal/version": { legalVersion },
    "next/navigation": { redirect: (url: string) => { throw new Error(`redirect:${url}`); } },
    "@/lib/auth/player-session": { createPublicPlayerSession: async (id: string) => { sessions.push(id); }, destroyPublicPlayerSession: async () => {} },
    "@/lib/prisma": { prisma },
    "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma) },
    "@/lib/services/public-client-registration": { resolvePublicClientPlayer: () => null },
    "@/lib/env": { env: { playerPhoneVerificationRequired: true } },
    "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: async (_phone: string, message: string) => { sent.push(message); } },
    "@/lib/phone": { normalizeBrazilianPhone: (value: string) => value.replace(/\D/g, "") },
    "@/lib/auth/login-attempts": { activeLoginLock: async () => null, recordFailedLogin: async () => null, clearLoginFailures: async () => {} },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { exports, require: (name: string) => name in mocks ? mocks[name] : require(name), FormData, Date, URL, Buffer, console });
  const form = (code?: string) => { const data = new FormData(); data.set("termsAccepted", "on"); data.set("legalVersion", legalVersion); data.set("arenaSlug", "arena-teste"); data.set("returnTo", ""); data.set("name", "Atleta de Teste"); data.set("phone", "11999990000"); data.set("password", "SenhaSegura123!"); data.set("confirmPassword", "SenhaSegura123!"); if (code) data.set("code", code); return data; };
  const request = () => exports.registerPublicClientAction({ error: null }, form());
  const confirm = (code: string) => exports.confirmPublicClientRegistrationAction({ error: null }, form(code));
  const requestReset = () => exports.requestPublicPasswordResetAction({ error: null }, form());
  const confirmReset = (code: string) => { const data = form(code); data.set("newPassword", "NovaSenhaSegura123!"); data.set("confirmPassword", "NovaSenhaSegura123!"); return exports.confirmPublicPasswordResetAction({ error: null }, data); };
  const requestCustom = (values: Record<string, string>) => { const data = form(); for (const [key, value] of Object.entries(values)) data.set(key, value); return exports.registerPublicClientAction({ error: null }, data); };
  const confirmCustom = (code: string, values: Record<string, string>) => { const data = form(code); for (const [key, value] of Object.entries(values)) data.set(key, value); return exports.confirmPublicClientRegistrationAction({ error: null }, data); };
  return { requestCustom, confirmCustom, request, confirm, requestReset, confirmReset, sent, codes, accounts, sessions };
}

test("cadastro verificado envia código, confirma uma vez e vincula a arena correta", async () => {
  const app = fixture();
  const requested = await app.request();
  assert.equal(requested.error, null);
  assert.equal(requested.requested, true);
  assert.equal(app.accounts.length, 0);
  const code = app.sent[0]?.match(/\b\d{6}\b/)?.[0];
  assert.ok(code);
  await assert.rejects(app.confirm(code), /redirect:\/reservar\/arena-teste/);
  assert.equal(app.accounts.length, 1);
  assert.equal(app.accounts[0].arenaId, "arena-a");
  assert.equal(app.sessions.length, 1);
  assert.ok(app.codes[0].usedAt);
  const replay = await app.confirm(code);
  assert.match(replay.error, /código|conta/i);
  assert.equal(app.accounts.length, 1);
});

test("cinco códigos incorretos bloqueiam a confirmação", async () => {
  const app = fixture();
  await app.request();
  for (let attempt = 0; attempt < 5; attempt++) assert.match((await app.confirm("000000")).error, /Código inválido/);
  assert.equal(app.codes[0].attempts, 5);
  const code = app.sent[0]?.match(/\b\d{6}\b/)?.[0];
  assert.ok(code);
  assert.match((await app.confirm(code)).error, /limite de tentativas/);
  assert.equal(app.accounts.length, 0);
});

test("recuperação do atleta consome código uma vez e limita palpites incorretos", async () => {
  const app = fixture({ existingAccount: true });
  assert.equal((await app.requestReset()).requested, true);
  const code = app.sent[0]?.match(/\b\d{6}\b/)?.[0];
  assert.ok(code);
  assert.match((await app.confirmReset("000000")).error, /Código inválido/);
  assert.equal(app.codes[0].attempts, 1);
  assert.equal((await app.confirmReset(code)).error, null);
  assert.ok(app.codes[0].usedAt);
  assert.notEqual(app.accounts[0].passwordHash, "old-hash");
  assert.match((await app.confirmReset(code)).error, /Código inválido/);
});


test("cadastro exige termos atuais antes de enviar códigos e grava o aceite no servidor", async () => {
 const app = fixture();
 assert.match((await app.requestCustom({ termsAccepted: "" })).error, /Termos de Uso/);
 assert.match((await app.requestCustom({ legalVersion: "old-version" })).error, /versão atual/);
 assert.equal(app.sent.length, 0); assert.equal(app.codes.length, 0); assert.equal(app.accounts.length, 0);
 await app.request(); const code = app.sent[0].match(/\b\d{6}\b/)![0];
 assert.match((await app.confirmCustom(code, { termsAccepted: "" })).error, /Termos de Uso/); assert.equal(app.codes[0].usedAt, null);
 const since = Date.now();
 await assert.rejects(app.confirmCustom(code, { termsAcceptedAt: "2000-01-01", privacyNoticeVersion: "forged" }), /redirect:/);
 assert.equal(app.accounts[0].termsVersion, legalVersion); assert.equal(app.accounts[0].privacyNoticeVersion, legalVersion);
 assert.ok(app.accounts[0].termsAcceptedAt!.getTime() >= since);
});
