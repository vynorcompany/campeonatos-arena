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
  const legacyInstanceToken = connection?.encryptedToken ? decryptConnectionSecrets(connection.encryptedToken).token : "";
  const send = (apiKey: string) => fetch(`${config.apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    headers: { apikey: apiKey, "content-type": "application/json" },
    body: JSON.stringify(buildEvolutionTextPayload(phone, text)),
    cache: "no-store"
  });
  // Evolution v2 usa a chave global da instalação; o fallback só ocorre em
  // rejeição de autenticação para não duplicar mensagens em caso de falha.
  let response = await send(config.apiKey);
  if ((response.status === 401 || response.status === 403) && legacyInstanceToken && legacyInstanceToken !== config.apiKey) {
    response = await send(legacyInstanceToken);
  }

  if (!response.ok) {
    throw new Error(`A Evolution recusou o envio da mensagem (${response.status}).`);
  }

  return response.json() as Promise<unknown>;
}

export async function sendEvolutionAudioMessage(phone: string, audioDataUrl: string, arenaId: string) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("O WhatsApp desta arena ainda não está conectado.");
  const config = getEvolutionConfig();
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const response = await fetch(`${config.apiUrl}/message/sendWhatsAppAudio/${encodeURIComponent(connection.instanceName)}`, {
    method: "POST", headers: { apikey: config.apiKey, "content-type": "application/json" }, body: JSON.stringify({ number, audio: audioDataUrl }), cache: "no-store"
  });
  if (!response.ok) throw new Error(`A Evolution recusou o envio do áudio (${response.status}).`);
  return response.json().catch(() => ({})) as Promise<unknown>;
}

export async function getEvolutionProfilePicture(remoteJid: string, arenaId: string) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId }, select: { instanceName: true, status: true } });
  if (!connection || connection.status !== "CONNECTED") return "";
  const config = getEvolutionConfig();
  const response = await fetch(`${config.apiUrl}/chat/fetchProfilePictureUrl/${encodeURIComponent(connection.instanceName)}`, {
    method: "POST", headers: { apikey: config.apiKey, "content-type": "application/json" }, body: JSON.stringify({ number: remoteJid }), cache: "no-store"
  });
  if (!response.ok) return "";
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  return String(payload.profilePictureUrl ?? payload.profilePicUrl ?? payload.url ?? "");
}

export async function getEvolutionMediaDataUrl(input: { providerId: string; providerPayload: unknown; mimeType: string; mediaUrl: string }, arenaId: string) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId }, select: { instanceName: true, status: true } });
  if (!connection || connection.status !== "CONNECTED") return "";
  const config = getEvolutionConfig();
  const response = await fetch(`${config.apiUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(connection.instanceName)}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify({ message: { key: { id: input.providerId }, message: input.providerPayload }, convertToMp4: false }),
    cache: "no-store"
  });
  if (response.ok) {
    const payload = await response.json().catch(() => null);
    const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const nested = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
    const rawValue = record.base64 ?? record.media ?? record.base64Data ?? (typeof record.data === "string" ? record.data : undefined) ?? nested.base64 ?? nested.media ?? nested.base64Data ?? "";
    const raw = String(rawValue).trim();
    if (raw) return raw.startsWith("data:") ? raw : `data:${input.mimeType || "application/octet-stream"};base64,${raw}`;
  }
  return /^https?:\/\//i.test(input.mediaUrl) ? input.mediaUrl : "";
}
