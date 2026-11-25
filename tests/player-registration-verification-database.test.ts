import { withDatabaseModuleMocks } from "./helpers/client-module-mocks";
import { normalizeBrazilianPhone } from "../src/lib/phone";
import { legalVersion } from "../src/lib/legal/version";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

for (const existingContact of [false, true]) {
test(`cadastro por código sincroniza e-mail (${existingContact ? "contato existente" : "novo contato"}) sem cruzar arenas`, { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback do cadastro de teste");
  const phone = existingContact ? "11977770043" : "11977770042";
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const [arenaA, arenaB] = await Promise.all([
        tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } }),
        tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } }),
      ]);
      assert.equal(await tx.playerAccount.count({ where: { phone } }), 0);
      if (existingContact) await tx.player.create({ data: { arenaId: arenaA.id, name: "Contato existente", phone, email: "original@example.test" } });
      const foreign = await tx.player.create({ data: { arenaId: arenaB.id, name: "Contato outra arena", phone, email: "foreign@example.test" } });
      const sent: string[] = [];
      const sessions: string[] = [];
      const exports: Record<string, (...args: any[]) => Promise<any>> = {};
      const prisma = {
        arena: tx.arena, playerAccount: tx.playerAccount, athleteIdentity: tx.athleteIdentity,
        player: tx.player, playerVerificationCode: tx.playerVerificationCode,
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      };
      const mocks: Record<string, unknown> = {
    "@/lib/legal/version": { legalVersion },
        "next/navigation": { redirect: (url: string) => { throw new Error(`redirect:${url}`); } },
        "@/lib/auth/player-session": { createPublicPlayerSession: async (id: string) => { sessions.push(id); }, destroyPublicPlayerSession: async () => {} },
        "@/lib/prisma": { prisma },
        "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx) },
        "@/lib/services/public-client-registration": { resolvePublicClientPlayer: (players: any[]) => players.find(player => player.phone === phone) ?? null },
        "@/lib/env": { env: { playerPhoneVerificationRequired: true } },
        "@/lib/integrations/evolution/client": { sendEvolutionTextMessage: async (_phone: string, message: string) => { sent.push(message); } },
        "@/lib/phone": { normalizeBrazilianPhone },
        "@/lib/auth/login-attempts": { activeLoginLock: async () => null, recordFailedLogin: async () => null, clearLoginFailures: async () => {} },
      };
      const source = readFileSync(new URL("../src/lib/actions/player-auth.ts", import.meta.url), "utf8");
      vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { exports, require: withDatabaseModuleMocks((name: string) => name in mocks ? mocks[name] : require(name)), FormData, Date, URL, Buffer, console });
      const form = (code?: string) => { const data = new FormData(); data.set("termsAccepted", "on"); data.set("legalVersion", legalVersion); data.set("arenaSlug", "arena-teste-goal"); data.set("returnTo", ""); data.set("email", "Atleta@Example.test"); data.set("name", "Atleta Descartável GOAL"); data.set("phone", code ? phone : `+55${phone}`); data.set("password", "GoalSenha123!"); data.set("confirmPassword", "GoalSenha123!"); if (code) data.set("code", code); return data; };

      const requested = await exports.registerPublicClientAction({ error: null }, form());
      assert.equal(requested.requested, true);
      if (existingContact) assert.equal((await tx.player.findFirstOrThrow({ where: { arenaId: arenaA.id, phone } })).email, "original@example.test");
      const ownCode = sent[0]?.match(/\b\d{6}\b/)?.[0];
      assert.ok(ownCode);
      const otherCode = ownCode === "222222" ? "333333" : "222222";
      await tx.playerVerificationCode.create({ data: { arenaId: arenaB.id, phone, purpose: "REGISTER", codeHash: crypto.createHash("sha256").update(otherCode).digest("hex"), expiresAt: new Date(Date.now() + 600_000) } });
      assert.match((await exports.confirmPublicClientRegistrationAction({ error: null }, form(otherCode))).error, /Código inválido/);
      assert.equal(await tx.playerAccount.count({ where: { phone } }), 0);
      const confirmations = await Promise.allSettled([
        exports.confirmPublicClientRegistrationAction({ error: null }, form(ownCode)),
        exports.confirmPublicClientRegistrationAction({ error: null }, form(ownCode)),
      ]);
      assert.equal(confirmations.filter((result) => result.status === "rejected" && String(result.reason).includes("redirect:/reservar/arena-teste-goal")).length, 1);
      assert.equal(confirmations.filter((result) => result.status === "fulfilled" && /código|conta/i.test(result.value.error ?? "")).length, 1);
      assert.equal(await tx.playerAccount.count({ where: { arenaId: arenaA.id, phone } }), 1);
      assert.equal(await tx.playerAccount.count({ where: { arenaId: arenaB.id, phone } }), 0);
      const accepted = await tx.playerAccount.findFirstOrThrow({ where: { arenaId: arenaA.id, phone } });
      assert.equal((await tx.player.findUniqueOrThrow({ where: { id: accepted.playerId } })).email, "atleta@example.test");
      assert.equal((await tx.player.findUniqueOrThrow({ where: { id: foreign.id } })).email, "foreign@example.test");
      assert.equal(await tx.player.count({ where: { arenaId: arenaA.id, phone } }), 1);
      const identity = await tx.athleteIdentity.findUniqueOrThrow({ where: { id: accepted.identityId! } });
      assert.equal(identity.recoveryEmailVerifiedAt, null);
      assert.equal(accepted.termsVersion, legalVersion); assert.equal(accepted.privacyNoticeVersion, legalVersion); assert.ok(accepted.termsAcceptedAt);
      assert.equal(sessions.length, 1);
      assert.match((await exports.registerPublicClientAction({ error: null }, form())).error, /já possui uma conta/);
      assert.match((await exports.confirmPublicClientRegistrationAction({ error: null }, form(ownCode))).error, /conta|código/i);
      assert.equal(await tx.playerAccount.count({ where: { phone } }), 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
    assert.equal(await db.playerAccount.count({ where: { phone } }), 0);
  } finally {
    await db.$disconnect();
  }
});

}
