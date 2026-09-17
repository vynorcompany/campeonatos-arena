import "server-only";

import { env } from "@/lib/env";
import { buildEvolutionTextPayload } from "@/lib/integrations/evolution";
import { decryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { prisma } from "@/lib/prisma";

function getEvolutionConfig() {
  if (!env.evolutionApiUrl || !env.evolutionApiKey) throw new Error("A integração Evolution ainda não está configurada.");
  return { apiUrl: env.evolutionApiUrl.replace(/\/$/, ""), apiKey: env.evolutionApiKey, instanceName: env.evolutionInstanceName };
}

export async function sendEvolutionTextMessage(phone: string, text: string, arenaId?: string) {
  const connection = arenaId ? await prisma.whatsAppConnection.findUnique({ where: { arenaId } }) : null;
  if (arenaId && (!connection || connection.status !== "CONNECTED" || !connection.encryptedToken)) throw new Error("O WhatsApp desta arena ainda não está conectado.");
  const config = getEvolutionConfig();
  const instanceName = connection?.instanceName ?? config.instanceName;
  if (!instanceName) throw new Error("Nenhuma instância Evolution foi definida.");
  const apiKey = connection?.encryptedToken ? decryptConnectionSecrets(connection.encryptedToken).token : config.apiKey;
  const response = await fetch(`${config.apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    headers: { apikey: apiKey, "content-type": "application/json" },
    body: JSON.stringify(buildEvolutionTextPayload(phone, text)),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`A Evolution recusou o envio da mensagem (${response.status}).`);
  }

  return response.json() as Promise<unknown>;
}
