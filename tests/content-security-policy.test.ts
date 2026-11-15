import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomBytes, webcrypto } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { contentSecurityPolicy } from "../src/lib/security/content-security-policy.mjs";

function directive(policy: string, name: string) {
  return policy.split(";").map(value => value.trim()).find(value => value.startsWith(name + " "));
}

test("production policy authorizes nonced scripts without allowing inline handlers or eval", () => {
  const nonce = randomBytes(32).toString("base64");
  const policy = contentSecurityPolicy({ nonce });
  assert.ok(directive(policy, "script-src")?.includes(`'nonce-${nonce}'`));
  assert.ok(directive(policy, "script-src")?.includes("'strict-dynamic'"));
  assert.doesNotMatch(directive(policy, "script-src")!, /unsafe-inline|unsafe-eval/);
  assert.equal(directive(policy, "script-src-attr"), "script-src-attr 'none'");
  assert.match(policy, /https:\/\/\*\.mercadopago\.com/);
  assert.throws(() => contentSecurityPolicy({ nonce: "untrusted'; script-src *" }));
  assert.match(contentSecurityPolicy({ nonce, development: true }), /unsafe-eval/);
});

test("middleware replaces supplied headers and creates a fresh policy for each render", () => {
  const exports: Record<string, (request: { headers: Headers }) => { headers: Headers; forwarded: Headers }> = {};
  const source = readFileSync("src/middleware.ts", "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Headers, Uint8Array, btoa, crypto: webcrypto, process: { env: { NODE_ENV: "production" } },
    require(name: string) {
      if (name === "next/server") return { NextResponse: { next: (options: { request: { headers: Headers } }) => ({ headers: new Headers(), forwarded: options.request.headers }) } };
      if (name.endsWith("content-security-policy.mjs")) return { contentSecurityPolicy };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  const first = exports.middleware({ headers: new Headers({ "x-nonce": "attacker", "Content-Security-Policy": "script-src *" }) });
  const second = exports.middleware({ headers: new Headers() });
  const nonce = first.forwarded.get("x-nonce");
  assert.ok(nonce && nonce !== "attacker");
  assert.notEqual(nonce, second.forwarded.get("x-nonce"));
  assert.equal(first.headers.get("Content-Security-Policy"), first.forwarded.get("Content-Security-Policy"));
  assert.match(first.headers.get("Cache-Control")!, /private.*no-store/);
});

test('browser validation disables dynamic compilation before application hydration', () => {
  const source = readFileSync('src/instrumentation-client.ts', 'utf8');
  assert.match(source, /config\(\{ jitless: true \}\)/);
});
