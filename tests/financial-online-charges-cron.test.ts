import assert from "node:assert/strict";
import test from "node:test";
import railwayConfig from "../.railway/railway";

test("infraestrutura agenda a cobrança diária usando as credenciais do aplicativo", async () => {
  const graph = await railwayConfig({ environment: "production" } as Parameters<typeof railwayConfig>[0], undefined as never);
  const resources = graph.resources as Array<{ name?: string; kind?: string; deploy?: { cronSchedule?: string }; variables?: Record<string, unknown> }> | undefined;
  assert.ok(resources);
  const job = resources.find((resource) => resource.name === "financial-online-charges");
  assert.ok(job);
  assert.equal(job.kind, "function");
  assert.equal(job.deploy?.cronSchedule, "0 9 * * *");
  assert.deepEqual(job.variables?.APP_URL, { type: "reference", resource: "service.service-arena-padel-manager", output: "APP_URL" });
  assert.deepEqual(job.variables?.CRON_SECRET, { type: "reference", resource: "service.service-arena-padel-manager", output: "CRON_SECRET" });
});

test("agendador financeiro chama a rota autenticada e falha quando a execução falha", async () => {
  const previousUrl = process.env.APP_URL;
  const previousSecret = process.env.CRON_SECRET;
  const previousFetch = globalThis.fetch;
  const previousLog = console.log;
  const previousError = console.error;
  const previousExitCode = process.exitCode;
  const calls: { url: string; method: string; authorization: string }[] = [];
  const logs: string[] = [];
  process.env.APP_URL = "https://arena.example.test/portal";
  process.env.CRON_SECRET = "segredo-de-teste-com-mais-de-24-caracteres";
  console.log = (message: string) => { logs.push(message); };
  console.error = () => {};
  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), method: init?.method ?? "", authorization: new Headers(init?.headers).get("authorization") ?? "" });
      return Response.json({ ok: true, scanned: 3, created: 2, skipped: 1, failed: 0 });
    };
    const cron = await import("../.railway/functions/financial-online-charges");
    await cron.execution;
    assert.deepEqual(calls, [{
      url: "https://arena.example.test/api/jobs/financial-online-charges",
      method: "POST",
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    }]);
    assert.deepEqual(JSON.parse(logs[0]), { scanned: 3, created: 2, skipped: 1, failed: 0 });

    globalThis.fetch = async () => Response.json({ error: "Internal Server Error" }, { status: 500 });
    await assert.rejects(cron.runFinancialOnlineCharges(), /HTTP 500/);
    assert.equal(logs.length, 1);

    process.env.CRON_SECRET = "";
    await assert.rejects(cron.runFinancialOnlineCharges(), /CRON_SECRET/);
  } finally {
    if (previousUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;
    globalThis.fetch = previousFetch;
    console.log = previousLog;
    console.error = previousError;
    process.exitCode = previousExitCode;
  }
});
