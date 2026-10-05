import "server-only";

import { env } from "@/lib/env";
import { buildEvolutionTextPayload, evolutionRecipientNumber } from "@/lib/integrations/evolution";
import { decryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { prisma } from "@/lib/prisma";
import { readEvolutionGroupName } from "./groups";

function getEvolutionConfig() {
  if (!env.evolutionApiUrl || !env.evolutionApiKey) throw new Error("A integração Evolution ainda não está configurada.");
  return { apiUrl: env.evolutionApiUrl.replace(/\/$/, ""), apiKey: env.evolutionApiKey, instanceName: env.evolutionInstanceName };
}

export type EvolutionMessageKey = { id: string; remoteJid: string; fromMe: boolean; participant?: string };
export type EvolutionQuotedMessage = { key: EvolutionMessageKey; message: Record<string, unknown> };

export async function sendEvolutionTextMessage(phone: string, text: string, arenaId?: string, quoted?: EvolutionQuotedMessage) {
  const connection = arenaId ? await prisma.whatsAppConnection.findUnique({ where: { arenaId } }) : null;
  if (arenaId && (!connection || connection.status !== "CONNECTED" || !connection.encryptedToken)) throw new Error("O WhatsApp desta arena ainda não está conectado.");
  const config = getEvolutionConfig();
  const instanceName = connection?.instanceName ?? config.instanceName;
  if (!instanceName) throw new Error("Nenhuma instância Evolution foi definida.");
  const legacyInstanceToken = connection?.encryptedToken ? decryptConnectionSecrets(connection.encryptedToken).token : "";
  const send = (apiKey: string) => fetch(`${config.apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    headers: { apikey: apiKey, "content-type": "application/json" },
    body: JSON.stringify({ ...buildEvolutionTextPayload(phone, text), ...(phone.endsWith("@g.us") ? { number: phone } : {}), ...(quoted ? { quoted } : {}) }),
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

export async function sendEvolutionAudioMessage(phone: string, audioDataUrl: string, arenaId: string, quoted?: EvolutionQuotedMessage) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("O WhatsApp desta arena ainda não está conectado.");
  const config = getEvolutionConfig();
  const number = evolutionRecipientNumber(phone);
  const response = await fetch(`${config.apiUrl}/message/sendWhatsAppAudio/${encodeURIComponent(connection.instanceName)}`, {
    method: "POST", headers: { apikey: config.apiKey, "content-type": "application/json" }, body: JSON.stringify({ number: phone.endsWith("@g.us") ? phone : number, audio: audioDataUrl, ...(quoted ? { quoted } : {}) }), cache: "no-store"
  });
  if (!response.ok) throw new Error(`A Evolution recusou o envio do áudio (${response.status}).`);
  return response.json().catch(() => ({})) as Promise<unknown>;
}

export async function sendEvolutionMediaMessage(phone: string, mediaDataUrl: string, mediaType: "image" | "document", fileName: string, mimeType: string, arenaId: string, quoted?: EvolutionQuotedMessage) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("O WhatsApp desta arena ainda não está conectado.");
  const config = getEvolutionConfig(); const number = evolutionRecipientNumber(phone);
  const send = (media: string) => fetch(`${config.apiUrl}/message/sendMedia/${encodeURIComponent(connection.instanceName)}`, { method: "POST", headers: { apikey: config.apiKey, "content-type": "application/json" }, body: JSON.stringify({ number: phone.endsWith("@g.us") ? phone : number, mediatype: mediaType, media, fileName, mimetype: mimeType, caption: "", ...(quoted ? { quoted } : {}) }), cache: "no-store" });
  let response = await send(mediaDataUrl);
  if (!response.ok && mediaDataUrl.includes(",")) response = await send(mediaDataUrl.slice(mediaDataUrl.indexOf(",") + 1));
  if (!response.ok) { const detail = (await response.text().catch(() => "")).slice(0, 180); throw new Error(`A Evolution recusou o envio do anexo (${response.status})${detail ? `: ${detail}` : "."}`); }
  return response.json().catch(() => ({})) as Promise<unknown>;
}

export async function sendEvolutionReaction(key: EvolutionMessageKey, reaction: string, arenaId: string) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("O WhatsApp desta arena ainda não está conectado.");
  const config = getEvolutionConfig();
  const response = await fetch(`${config.apiUrl}/message/sendReaction/${encodeURIComponent(connection.instanceName)}`, {
    method: "POST", headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify({ key, reaction }), cache: "no-store",
  });
  if (!response.ok) throw new Error(`A Evolution recusou a reação (${response.status}).`);
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

export async function getEvolutionGroupName(remoteJid: string, arenaId: string) {
  if (!remoteJid.endsWith("@g.us")) return "";
  const connection = await prisma.whatsAppConnection.findUnique({ where: { arenaId }, select: { instanceName: true, status: true } });
  if (!connection || connection.status !== "CONNECTED") return "";
  const config = getEvolutionConfig();
  const instance = encodeURIComponent(connection.instanceName);
  const direct = await fetch(`${config.apiUrl}/group/findGroupInfos/${instance}?groupJid=${encodeURIComponent(remoteJid)}`, {
    headers: { apikey: config.apiKey }, cache: "no-store", signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const directName = direct?.ok ? readEvolutionGroupName(await direct.json().catch(() => null), remoteJid) : "";
  if (directName) return directName;
  const url = `${config.apiUrl}/group/fetchAllGroups/${instance}?getParticipants=false`;
  const request = (method: "GET" | "POST") => fetch(url, {
    method,
    headers: method === "POST" ? { apikey: config.apiKey, "content-type": "application/json" } : { apikey: config.apiKey },
    body: method === "POST" ? "{}" : undefined,
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  const findName = (payload: unknown) => readEvolutionGroupName(payload, remoteJid);

  // Instalações antigas podem exigir POST para a listagem de grupos.
  const getResponse = await request("GET").catch(() => null);
  const getName = getResponse?.ok ? findName(await getResponse.json().catch(() => null)) : "";
  if (getName) return getName;
  const postResponse = await request("POST").catch(() => null);
  return postResponse?.ok ? findName(await postResponse.json().catch(() => null)) : "";
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
