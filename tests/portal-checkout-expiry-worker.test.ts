import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("expiry worker starts once, does not overlap runs, and resumes after a rejected run", async () => {
  let callback!: () => Promise<void>;
  let timers = 0, calls = 0, unrefs = 0, warnings = 0;
  let release!: () => void;
  let pending: Promise<unknown> = new Promise<void>(resolve => { release = resolve; });
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/payments/portal-checkout-expiry-worker.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: () => ({ expirePortalCheckouts: async () => { calls++; await pending; return { failed: 0 }; } }),
    setInterval: (cb: () => Promise<void>, milliseconds: number) => { assert.equal(milliseconds, 60_000); callback = cb; timers++; return { unref: () => { unrefs++; } }; },
    console: { warn: () => { warnings++; }, error: () => { warnings++; } },
  });
  exports.startPortalCheckoutExpiryWorker(); exports.startPortalCheckoutExpiryWorker();
  assert.equal(timers, 1); assert.equal(unrefs, 1);
  callback(); await Promise.resolve();
  callback(); await Promise.resolve(); assert.equal(calls, 1);
  release(); await new Promise(resolve => setImmediate(resolve));
  pending = Promise.reject(new Error("database unavailable"));
  callback(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2); assert.equal(warnings, 1);
  pending = Promise.resolve(); callback(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 3);
});

test("server registration starts the worker only when explicitly enabled in the Node runtime", async () => {
  const source = readFileSync(new URL("../src/instrumentation.ts", import.meta.url), "utf8");
  for (const [runtime, enabled, phase, expected] of [["nodejs", "true", undefined, 1], ["nodejs", "false", undefined, 0], ["nodejs", undefined, undefined, 0], ["edge", "true", undefined, 0], ["nodejs", "true", "phase-production-build", 0]]) {
    let starts = 0;
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, process: { env: { NEXT_RUNTIME: runtime, PLAN_PRICE_WORKER_ENABLED: "false", PORTAL_CHECKOUT_EXPIRY_WORKER_ENABLED: enabled, NEXT_PHASE: phase } },
      require: (path: string) => { assert.equal(path, "./lib/payments/portal-checkout-expiry-worker"); return { startPortalCheckoutExpiryWorker: () => { starts++; } }; },
    });
    await exports.register(); assert.equal(starts, expected);
  }
});
