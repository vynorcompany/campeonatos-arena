import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";

test("privacy mutations require own authenticated account, fresh password, throttle and explicit removal consent", async () => {
  let signedIn = false, locked = false, validPassword = false;
  let transactionCalls = 0, failures = 0, erased = 0;
  let validHash: string | undefined;
  const account = { passwordHash: "stored-account-hash", identity: { passwordHash: "stored-identity-hash" } };
  const auth = { playerId: "own-player", playerAccountId: "own-account", arenaId: "own-arena" };
  const tx = { $queryRaw: async () => [{ passwordHash: account.passwordHash, identityId: "own-identity" }], athleteIdentity: { findUnique: async () => account.identity } };
  const mocks: Record<string, unknown> = {
    bcryptjs: { compare: async (password: string, hash: string) => { assert.ok([account.identity.passwordHash, account.passwordHash].includes(hash)); return validPassword && password === "correct-password" && (!validHash || hash === validHash); } }, zod: { z }, "next/cache": { revalidatePath() {} },
    "@/lib/auth/player-session": { getPublicPlayerAuth: async () => signedIn ? auth : null },
    "@/lib/auth/login-attempts": { activeLoginLock: async () => locked ? new Date() : null, clearLoginFailures: async () => {}, recordFailedLogin: async () => { failures++; } },
    "@/lib/prisma": { prisma: { playerAccount: { findFirst: async (args: any) => { assert.deepEqual(JSON.parse(JSON.stringify(args.where)), { id: "own-account", arenaId: "own-arena", playerId: "own-player" }); return account; } } } },
    "@/lib/rls": { withArenaTransaction: async (arenaId: string, operation: (value: unknown) => unknown) => { assert.equal(arenaId, "own-arena"); transactionCalls++; return operation(tx); } },
    "@/lib/legal/membership-erasure": { eraseArenaMembership: async () => ({ protocol: "own-receipt", retentionNotice: "Financial records retained" }) },
    "@/lib/legal/privacy-service": {
      eraseOptionalProfile: async (_tx: unknown, owner: any) => { assert.deepEqual(JSON.parse(JSON.stringify(owner)), { arenaId: "own-arena", playerId: "own-player" }); erased++; },
      exportPrivateProfile: async () => ({ profile: { name: "Own Person" } }),
    },
  };
  const actions: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/privacy.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { exports: actions, FormData, Date, require: (name: string) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; } });
  const form = () => { const data = new FormData(); for (const [key, value] of Object.entries({ arenaSlug: "own-arena", password: "correct-password", operation: "CLEAR_PROFILE", playerId: "foreign-player", arenaId: "foreign-arena" })) data.set(key, value); return data; };
  assert.match((await actions.privacyAction({}, form())).error, /Entre na conta/);
  signedIn = true; locked = true;
  assert.match((await actions.privacyAction({}, form())).error, /Muitas tentativas/);
  locked = false;
  assert.match((await actions.privacyAction({}, form())).error, /Senha atual incorreta/);
  assert.equal(failures, 1); assert.equal(transactionCalls, 0);
  validPassword = true;
  assert.match((await actions.privacyAction({}, form())).error, /Confirme a remoção/);
  assert.equal(transactionCalls, 0);
  const confirmed = form(); confirmed.set("confirmRemoval", "on");
  assert.equal((await actions.privacyAction({}, confirmed)).error, null);
  assert.equal(erased, 1);
  const bot = form(); bot.set("contactWebsite", "bot.example");
  assert.match((await actions.privacyAction({}, bot)).error, /validar/);
  assert.equal(erased, 1);
  const exporting = form(); exporting.set("operation", "EXPORT");
  for (const hash of [account.passwordHash, account.identity.passwordHash]) {
    validHash = hash;
    assert.match((await actions.privacyAction({}, exporting)).download, /Own Person/);
  }
  validHash = undefined;
  const closing = form(); closing.set("operation", "CLOSE_MEMBERSHIP");
  assert.match((await actions.privacyAction({}, closing)).error, /digite EXCLUIR/);
  closing.set("confirmRemoval", "on"); closing.set("confirmation", "EXCLUIR");
  const closed = await actions.privacyAction({}, closing);
  assert.equal(closed.closed, true); assert.match(closed.download, /own-receipt/);
  account.passwordHash = "changed-hash";
  tx.$queryRaw = async () => [{ passwordHash: "stale-hash", identityId: "own-identity" }];
  assert.match((await actions.privacyAction({}, confirmed)).error, /Não foi possível confirmar/);
  assert.equal(erased, 1);
});
