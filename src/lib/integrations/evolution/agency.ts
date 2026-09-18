import "server-only";

import crypto from "node:crypto";
import { env } from "@/lib/env";

function requiredEnvironment() {
  if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.appUrl) throw new Error("Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e APP_URL no ambiente da plataforma antes de conectar arenas.");
  return { apiUrl: env.evolutionApiUrl.replace(/\/$/, ""), apiKey: env.evolutionApiKey, appUrl: env.appUrl.replace(/\/$/, "") };
}

function qrDataUrl(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "";
  return raw.startsWith("data:image/") ? raw : `data:image/png;base64,${raw}`;
}

function providerMessage(payload: Record<string, unknown>) {
  const value = payload.message ?? payload.error ?? payload.response?.toString();
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 180);
}

export function createEvolutionInstanceName(arenaId: string) {
  return `arena-${arenaId.replace(/[^a-z0-9]/gi, "").slice(-18).toLowerCase()}`;
}

export function createEvolutionInstanceToken() { return crypto.randomUUID(); }
export function createEvolutionWebhookSecret() { return crypto.randomBytes(24).toString("base64url"); }

function webhookUrl(instanceName: string, webhookSecret: string) {
  const config = requiredEnvironment();
  return `${config.appUrl}/api/integrations/evolution/webhook?instance=${encodeURIComponent(instanceName)}&secret=${encodeURIComponent(webhookSecret)}`;
}

const webhookEvents = ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"];

export async function createEvolutionInstance(input: { instanceName: string; instanceToken: string; webhookSecret: string }) {
  const config = requiredEnvironment();
  const callbackUrl = webhookUrl(input.instanceName, input.webhookSecret);
  const request = (body: Record<string, unknown>) => fetch(`${config.apiUrl}/instance/create`, {
    method: "POST",
    headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  // Evolution v2 valida o webhook como objeto. Mantemos a tentativa legada
  // apenas para instalações antigas que ainda usam a configuração plana.
  let response = await request({
      instanceName: input.instanceName,
      token: input.instanceToken,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: { enabled: true, url: callbackUrl, byEvents: false, base64: true, events: webhookEvents }
  });
  if (!response.ok && response.status === 400) response = await request({ instanceName: input.instanceName, token: input.instanceToken, qrcode: true, integration: "WHATSAPP-BAILEYS", webhook: callbackUrl, webhook_by_events: false, events: webhookEvents });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`A Evolution não criou a instância (${response.status})${providerMessage(payload) ? `: ${providerMessage(payload)}` : "."}`);
  const qrcode = payload.qrcode as Record<string, unknown> | undefined;
  return { qrCodeDataUrl: qrDataUrl(qrcode?.base64 ?? payload.base64 ?? payload.qrcode) };
}

export async function configureEvolutionWebhook(input: { instanceName: string; webhookSecret: string }) {
  const config = requiredEnvironment();
  const response = await fetch(`${config.apiUrl}/webhook/set/${encodeURIComponent(input.instanceName)}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl(input.instanceName, input.webhookSecret),
      webhookByEvents: false,
      webhookBase64: true,
      events: webhookEvents,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`A Evolution não configurou o retorno da conexão (${response.status})${providerMessage(payload) ? `: ${providerMessage(payload)}` : "."}`);
}

export async function deleteEvolutionInstance(instanceName: string) {
  const config = requiredEnvironment();
  const response = await fetch(`${config.apiUrl}/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
    headers: { apikey: config.apiKey },
    cache: "no-store",
  });
  // A instância pode ter sido removida pela própria Evolution; nesse caso,
  // seguimos com a criação limpa normalmente.
  if (response.ok || response.status === 404) return;
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  throw new Error(`A Evolution não reiniciou a instância (${response.status})${providerMessage(payload) ? `: ${providerMessage(payload)}` : "."}`);
}

export async function getEvolutionQrCode(instanceName: string, instanceToken: string) {
  const config = requiredEnvironment();
  // A API v2 autentica os endpoints de instância com a chave da instalação,
  // não com o token interno salvo para a arena. O segundo valor mantém
  // compatibilidade com instalações antigas que ainda aceitam token próprio.
  const keys = [...new Set([config.apiKey, instanceToken].filter(Boolean))];
  let failure = "";
  for (const apiKey of keys) {
    const response = await fetch(`${config.apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, { headers: { apikey: apiKey }, cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      failure = `${response.status}${providerMessage(payload) ? `: ${providerMessage(payload)}` : ""}`;
      continue;
    }
    const qrcode = payload.qrcode as Record<string, unknown> | undefined;
    const value = qrDataUrl(qrcode?.base64 ?? payload.base64);
    if (value) return value;
    failure = "a instância não retornou uma imagem QR válida";
  }
  throw new Error(`A Evolution não disponibilizou o QR Code (${failure || "erro desconhecido"}).`);
}
