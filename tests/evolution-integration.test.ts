import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { buildEvolutionTextPayload, resolveEvolutionConfig } from "../src/lib/integrations/evolution";

test("requires every Evolution setting before enabling the integration", () => {
  assert.equal(resolveEvolutionConfig({ apiUrl: "", apiKey: "", instanceName: "", webhookSecret: "" }), null);
  assert.throws(
    () => resolveEvolutionConfig({ apiUrl: "https://evolution.example", apiKey: "key", instanceName: "", webhookSecret: "secret" }),
    /configuração da Evolution está incompleta/i
  );
});

test("builds the official text-message payload using a normalized Brazilian phone", () => {
  assert.deepEqual(buildEvolutionTextPayload("(47) 99999-1234", "Reserva confirmada."), {
    number: "5547999991234",
    textMessage: { text: "Reserva confirmada." }
  });
});

test("exposes a protected Evolution webhook route", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/integrations/evolution/webhook/route.ts"), "utf8");

  assert.match(route, /x-evolution-webhook-secret/);
  assert.match(route, /unauthorized/i);
  assert.match(route, /POST/);
});

test("keeps the Evolution URL optional until the Railway service is configured", () => {
  const env = readFileSync(resolve(process.cwd(), "src/lib/env.ts"), "utf8");

  assert.match(env, /EVOLUTION_API_URL:\s*optionalUrl/);
});
