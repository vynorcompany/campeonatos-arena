import "server-only";

import { env } from "@/lib/env";
import { buildEvolutionTextPayload, resolveEvolutionConfig } from "@/lib/integrations/evolution";

function getEvolutionConfig() {
  const config = resolveEvolutionConfig({
    apiUrl: env.evolutionApiUrl,
    apiKey: env.evolutionApiKey,
    instanceName: env.evolutionInstanceName,
    webhookSecret: env.evolutionWebhookSecret
  });
  if (!config) throw new Error("A integração Evolution ainda não está configurada.");
  return config;
}

export async function sendEvolutionTextMessage(phone: string, text: string) {
  const config = getEvolutionConfig();
  const response = await fetch(`${config.apiUrl}/message/sendText/${encodeURIComponent(config.instanceName)}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify(buildEvolutionTextPayload(phone, text)),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`A Evolution recusou o envio da mensagem (${response.status}).`);
  }

  return response.json() as Promise<unknown>;
}
