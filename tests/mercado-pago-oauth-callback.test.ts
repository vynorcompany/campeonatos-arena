import * as providerDeadline from "../src/lib/http/fetch-with-deadline";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { canPerformPermission } from "../src/lib/permissions";

const require = createRequire(import.meta.url);
const oauthSource = readFileSync(new URL("../src/lib/payments/mercado-pago-oauth.ts", import.meta.url), "utf8");
const callbackSource = readFileSync(new URL("../src/app/api/integrations/payments/mercado-pago/callback/route.ts", import.meta.url), "utf8");

function loadOAuth() {
  const exports: Record<string, (...args: never[]) => unknown> = {};
  vm.runInNewContext(ts.transpileModule(oauthSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    Buffer,
    Date,
    process: { env: { PAYMENT_CONNECTIONS_ENCRYPTION_KEY: "synthetic-test-key" } },
    require: (name: string) => name === "@/lib/http/fetch-with-deadline" ? providerDeadline : name === "server-only" ? {} : name === "@/lib/env" ? { env: { appUrl: "https://arena.example.test", mercadoPagoClientId: "client-id" } } : require(name),
  });
  return exports as {
    createMercadoPagoOAuthState: (arenaId: string, userId: string) => string;
    readMercadoPagoOAuthState: (state: string) => { arenaId: string; userId: string };
  };
}

function loadCallback(auth: { userId: string; arenaId: string | null; arenaRole: string | null; systemRole: string; editPermissions: string[] } | null) {
  const oauth = loadOAuth();
  let exchanges = 0;
  let writes = 0;
  const exports: Record<string, (request: Request) => Promise<{ url: string }>> = {};
  vm.runInNewContext(ts.transpileModule(callbackSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    Request,
    URL,
    Date,
    console,
    require: (name: string) => {
      if (name === "@/lib/http/fetch-with-deadline") return providerDeadline;
      if (name === "next/server") return { NextResponse: { redirect: (url: URL) => ({ url: url.toString() }) } };
      if (name === "@/lib/env") return { env: { appUrl: "https://arena.example.test" } };
      if (name === "@/lib/payments/connection-secrets") return { encryptConnectionSecrets: () => "encrypted-test" };
      if (name === "@/lib/payments/mercado-pago-oauth") return {
        readMercadoPagoOAuthState: oauth.readMercadoPagoOAuthState,
        exchangeMercadoPagoAuthorizationCode: async () => { exchanges++; return { access_token: "synthetic-token" }; },
        getMercadoPagoAccount: async () => ({ displayName: "Conta de teste", reference: "synthetic" }),
      };
      if (name === "@/lib/auth/session") return { getAuthContext: async () => auth };
      if (name === "@/lib/permissions") return { canPerformPermission };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_arenaId: string, operation: (tx: unknown) => Promise<unknown>) => operation({ paymentConnection: { upsert: async () => { writes++; } } }) };
      if (name === "@/lib/prisma") return { prisma: { agencyPaymentConnection: { upsert: async () => { writes++; } } } };
      if (name === "@/lib/services/agency-billing") return { issueDueAgencyInvoices: async () => undefined };
      return require(name);
    },
  });
  return { callback: exports.GET, oauth, counters: () => ({ exchanges, writes }) };
}

const user = (overrides: Partial<{ userId: string; arenaId: string; arenaRole: string; systemRole: string; editPermissions: string[] }> = {}) => ({
  userId: "operator-a", arenaId: "arena-a", arenaRole: "OWNER", systemRole: "VIEWER", editPermissions: [] as string[], ...overrides,
});

function callbackRequest(state: string) {
  return new Request(`https://arena.example.test/api/integrations/payments/mercado-pago/callback?code=test-code&state=${encodeURIComponent(state)}`);
}

test("OAuth state binds the target arena to the initiating user and rejects tampering", () => {
  const oauth = loadOAuth();
  const state = oauth.createMercadoPagoOAuthState("arena-a", "operator-a");
  assert.deepEqual(JSON.parse(JSON.stringify(oauth.readMercadoPagoOAuthState(state))), { arenaId: "arena-a", userId: "operator-a" });
  const [payload, signature] = state.split(".");
  const modified = Buffer.from(JSON.stringify({ arenaId: "arena-b", userId: "operator-a", issuedAt: Date.now(), nonce: "fake" })).toString("base64url");
  assert.throws(() => oauth.readMercadoPagoOAuthState(`${modified}.${signature}`), /não autorizado/);
  assert.throws(() => oauth.readMercadoPagoOAuthState(`${payload}.${signature}.extra`), /inválido/);
});

test("callback rejects a changed session before exchanging the authorization code", async () => {
  for (const auth of [null, user({ userId: "operator-b" }), user({ arenaId: "arena-b" }), user({ arenaRole: "STAFF" })]) {
    const loaded = loadCallback(auth);
    const state = loaded.oauth.createMercadoPagoOAuthState("arena-a", "operator-a");
    const response = await loaded.callback(callbackRequest(state));
    assert.match(response.url, /connectionError=/);
    assert.deepEqual(loaded.counters(), { exchanges: 0, writes: 0 });
  }
});

test("callback accepts the same authorized user and arena", async () => {
  const loaded = loadCallback(user());
  const state = loaded.oauth.createMercadoPagoOAuthState("arena-a", "operator-a");
  const response = await loaded.callback(callbackRequest(state));
  assert.match(response.url, /connected=mercado-pago/);
  assert.deepEqual(loaded.counters(), { exchanges: 1, writes: 1 });
});

test("callback só aceita gestão financeira da arena mesmo após OAuth iniciado", async () => {
  const denied = loadCallback(user({ arenaRole: "STAFF", editPermissions: ["finance:receivable:create"] }));
  const state = denied.oauth.createMercadoPagoOAuthState("arena-a", "operator-a");
  assert.match((await denied.callback(callbackRequest(state))).url, /connectionError=/);
  assert.deepEqual(denied.counters(), { exchanges: 0, writes: 0 });
  const allowed = loadCallback(user({ arenaRole: "STAFF", editPermissions: ["finance:settings:manage"] }));
  assert.match((await allowed.callback(callbackRequest(allowed.oauth.createMercadoPagoOAuthState("arena-a", "operator-a")))).url, /connected=mercado-pago/);
  assert.deepEqual(allowed.counters(), { exchanges: 1, writes: 1 });
});

test("agency callback requires an agency administrator", async () => {
  const denied = loadCallback(user({ systemRole: "MANAGER" }));
  const state = denied.oauth.createMercadoPagoOAuthState("agency-platform", "operator-a");
  assert.match((await denied.callback(callbackRequest(state))).url, /connectionError=/);
  assert.deepEqual(denied.counters(), { exchanges: 0, writes: 0 });
  const allowed = loadCallback(user({ systemRole: "ADMIN" }));
  assert.match((await allowed.callback(callbackRequest(allowed.oauth.createMercadoPagoOAuthState("agency-platform", "operator-a")))).url, /connected=mercado-pago/);
  assert.deepEqual(allowed.counters(), { exchanges: 1, writes: 1 });
});
