export async function runFinancialOnlineCharges() {
  const appUrl = process.env.APP_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!appUrl || !cronSecret || cronSecret.length < 24) {
    throw new Error("O agendador financeiro exige APP_URL e CRON_SECRET configurados.");
  }

  const target = new URL("/api/jobs/financial-online-charges", appUrl);
  if (target.protocol !== "https:" && target.hostname !== "localhost" && target.hostname !== "127.0.0.1") {
    throw new Error("O endereço do sistema para cobrança recorrente deve usar HTTPS.");
  }

  const response = await fetch(target, {
    method: "POST",
    headers: { authorization: `Bearer ${cronSecret}` },
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });

  if (!response.ok) {
    throw new Error(`A emissão recorrente falhou (HTTP ${response.status}).`);
  }

  const result = await response.json() as { ok?: boolean; scanned?: number; created?: number; skipped?: number; failed?: number };
  if (!result.ok) throw new Error("A emissão recorrente retornou falha.");
  console.log(JSON.stringify({ scanned: result.scanned, created: result.created, skipped: result.skipped, failed: result.failed }));
}

export const execution = runFinancialOnlineCharges();
execution.catch((error) => {
  console.error("O agendador financeiro não concluiu a execução:", error);
  process.exitCode = 1;
});
