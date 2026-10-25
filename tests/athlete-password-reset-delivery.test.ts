import { legalVersion } from "../src/lib/legal/version";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/actions/player-auth.ts", import.meta.url), "utf8");

function loadActions(deliveryFails: boolean) {
  const calls = { sent: 0, created: 0, removed: 0 };
  const prisma = {
    arena: { findUnique: async () => ({ id: "arena-a" }) },
    playerAccount: {
      findMany: async () => [{ id: "account-a", arenaId: "arena-a", identityId: "identity-a" }],
      findUnique: async () => ({ id: "account-a", arenaId: "arena-a", player: { active: true } }),
    },
    whatsAppConnection: { findFirst: async () => ({ arenaId: "arena-a", status: "CONNECTED" }) },
    playerVerificationCode: {
      findFirst: async () => null,
      count: async () => 0,
      updateMany: async () => ({ count: 0 }),
      create: async () => { calls.created += 1; return { id: "code-a" }; },
      delete: async () => { calls.removed += 1; return { id: "code-a" }; },
    },
  };
  const actions: Record<string, (_state: unknown, form: FormData) => Promise<Record<string, unknown>>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports: actions, FormData, Date, Buffer,
    require: (name: string) => {
      if (name === "@/lib/legal/version") return { legalVersion };
      if (name === "next/navigation") return { redirect() {} };
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_arenaId: string, callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma) };
      if (name === "@/lib/auth/player-session") return {};
      if (name === "@/lib/auth/login-attempts") return {};
      if (name === "@/lib/services/public-client-registration") return {};
      if (name === "@/lib/env") return { env: {} };
      if (name === "@/lib/phone") return { normalizeBrazilianPhone: (phone: string) => phone.replace(/\D/g, "") };
      if (name === "@/lib/integrations/evolution/client") return { sendEvolutionTextMessage: async () => { calls.sent += 1; if (deliveryFails) throw new Error("Evolution indisponível"); return { key: { id: "message-a" } }; } };
      return require(name);
    },
  });
  return { actions, calls };
}

for (const [label, actionName] of [
  ["portal global", "requestGlobalPublicPasswordResetAction"],
  ["portal da arena", "requestPublicPasswordResetAction"],
] as const) {
  test(`${label} não avança para o código quando o WhatsApp falha`, async () => {
    const { actions, calls } = loadActions(true);
    const form = new FormData();
    form.set("phone", "11999991111");
    if (actionName === "requestPublicPasswordResetAction") form.set("arenaSlug", "arena-a");
    const result = await actions[actionName]({ error: null }, form);
    assert.match(String(result.error), /Não foi possível enviar o código/);
    assert.notEqual(result.requested, true);
    assert.equal(calls.sent, 1);
    assert.equal(calls.created, 1);
    assert.equal(calls.removed, 1);
  });

  test(`${label} só avança após o WhatsApp aceitar o envio`, async () => {
    const { actions, calls } = loadActions(false);
    const form = new FormData();
    form.set("phone", "11999991111");
    if (actionName === "requestPublicPasswordResetAction") form.set("arenaSlug", "arena-a");
    const result = await actions[actionName]({ error: null }, form);
    assert.equal(result.error, null);
    assert.equal(result.requested, true);
    assert.equal(calls.sent, 1);
    assert.equal(calls.created, 1);
    assert.equal(calls.removed, 0);
  });
}
