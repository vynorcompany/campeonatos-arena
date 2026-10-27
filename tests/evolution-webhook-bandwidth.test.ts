import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import * as deadline from "../src/lib/http/fetch-with-deadline";

test("new and existing WhatsApp connections disable unused inline media in modern and legacy webhook payloads", async () => {
  for (const operation of ["createEvolutionInstance", "configureEvolutionWebhook"]) {
    const bodies: any[] = [];
    const exports: any = {};
    vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/integrations/evolution/agency.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, URLSearchParams, AbortSignal,
      fetch: async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        assert.ok(init.signal);
        const status = bodies.length === 1 ? 400 : 200;
        return { ok: status === 200, status, json: async () => ({}) };
      },
      require(name: string) {
        if (name === "@/lib/http/fetch-with-deadline") return deadline;
        if (name === "@/lib/env") return { env: { appUrl: "https://arena.test", evolutionApiUrl: "https://provider.test", evolutionApiKey: "fixture" } };
        return {};
      },
    });
    await exports[operation]({ instanceName: "fixture", instanceToken: "fixture", webhookSecret: "fixture" });
    assert.equal(bodies.length, 2);
    for (const body of bodies) {
      assert.equal(body.webhook.base64, false);
      assert.ok(body.webhook.events.includes("MESSAGES_UPSERT"));
      assert.ok(body.webhook.events.includes("QRCODE_UPDATED"));
    }
    assert.equal(bodies[0].webhook.headers["x-evolution-webhook-secret"], "fixture");
    assert.match(bodies[1].webhook.url, /secret=fixture/);
  }
});
