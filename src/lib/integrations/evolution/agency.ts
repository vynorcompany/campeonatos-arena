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

function webhookUrl(instanceName: string, webhookSecret = "") {
  const config = requiredEnvironment();
  const query = new URLSearchParams({ instance: instanceName });
  if (webhookSecret) query.set("secret", webhookSecret);
  return `${config.appUrl}/api/integrations/evolution/webhook?${query.toString()}`;
}

const webhookEvents = ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"];

function webhookConfiguration(instanceName: string, webhookSecret: string) {
  return {
    enabled: true,
    url: webhookUrl(instanceName),
    byEvents: false,
    base64: true,
    events: webhookEvents,
    headers: { "x-evolution-webhook-secret": webhookSecret },
  };
}

function legacyWebhookConfiguration(instanceName: string, webhookSecret: string) {
  return {
    enabled: true,
    url: webhookUrl(instanceName, webhookSecret),
    byEvents: false,
    base64: true,
    events: webhookEvents,
  };
}

function normalizeInstance(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const instance = record.instance && typeof record.instance === "object" ? record.instance as Record<string, unknown> : record;
  const name = String(instance.instanceName ?? instance.name ?? record.instanceName ?? record.name ?? "");
  const state = String(instance.connectionStatus ?? instance.status ?? instance.state ?? record.connectionStatus ?? record.status ?? record.state ?? "").toUpperCase();
  return name ? { name, state } : null;
}

export async function findEvolutionInstance(instanceName: string) {
  const config = requiredEnvironment();
  const endpoint = `${config.apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`;
  const response = await fetch(endpoint, { headers: { apikey: config.apiKey }, cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as unknown;
  // A Evolution responde 404 quando a instância não existe (inclusive após
  // um logout/removal feito pelo próprio WhatsApp). Isso não é uma falha de
  // consulta: é exatamente o sinal para preparar a mesma instância novamente.
  if (response.status === 404) return null;
  if (!response.ok) {
    const details = payload && typeof payload === "object" ? providerMessage(payload as Record<string, unknown>) : "";
    throw new Error(`A Evolution não confirmou a instância existente (${response.status})${details ? `: ${details}` : "."}`);
  }
  const candidates = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? [payload, ...(Array.isArray((payload as Record<string, unknown>).instances) ? (payload as Record<string, unknown>).instances as unknown[] : [])]
      : [];
  return candidates
    .map(normalizeInstance)
    .find((instance): instance is { name: string; state: string } => Boolean(instance && instance.name === instanceName)) ?? null;
}

export async function createEvolutionInstance(input: { instanceName: string; instanceToken: string; webhookSecret: string }) {
  const config = requiredEnvironment();
  const webhook = webhookConfiguration(input.instanceName, input.webhookSecret);
  const legacyWebhook = legacyWebhookConfiguration(input.instanceName, input.webhookSecret);
  const request = (body: Record<string, unknown>) => fetch(`${config.apiUrl}/instance/create`, {
    method: "POST",
    headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  // A Evolution 2.3.7 da arena não aceita cabeçalhos no momento da criação.
  // Tentamos a integração atual primeiro e então o objeto compatível, sem
  // descartar o token ou recriar a sessão.
  let response = await request({
      instanceName: input.instanceName,
      token: input.instanceToken,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      syncFullHistory: true,
      webhook,
  });
  if (!response.ok && [400, 403].includes(response.status)) response = await request({ instanceName: input.instanceName, token: input.instanceToken, qrcode: true, integration: "WHATSAPP-BAILEYS", syncFullHistory: true, webhook: legacyWebhook });
  if (!response.ok && response.status === 400) response = await request({ instanceName: input.instanceName, token: input.instanceToken, qrcode: true, integration: "WHATSAPP-BAILEYS", syncFullHistory: true, webhook: legacyWebhook.url, webhook_by_events: false, events: webhookEvents });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`A Evolution não criou a instância (${response.status})${providerMessage(payload) ? `: ${providerMessage(payload)}` : "."}`);
  const qrcode = payload.qrcode as Record<string, unknown> | undefined;
  return { qrCodeDataUrl: qrDataUrl(qrcode?.base64 ?? payload.base64 ?? payload.qrcode) };
}

export async function configureEvolutionWebhook(input: { instanceName: string; webhookSecret: string }) {
  const config = requiredEnvironment();
  const endpoint = `${config.apiUrl}/webhook/set/${encodeURIComponent(input.instanceName)}`;
  const webhook = webhookConfiguration(input.instanceName, input.webhookSecret);
  const legacyWebhook = legacyWebhookConfiguration(input.instanceName, input.webhookSecret);
  const request = (body: Record<string, unknown>) => fetch(endpoint, {
    method: "POST",
    headers: { apikey: config.apiKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  // Evolution v2 espera o payload aninhado. Além de ser o formato oficial,
  // ele mantém o segredo fora da URL (evitando que apareça nos logs do
  // provedor). A variante antiga fica apenas como compatibilidade para uma
  // instalação legada que não aceite o formato atual.
  let response = await request({ webhook });
  if (!response.ok && [400, 404].includes(response.status)) response = await request({ webhook: legacyWebhook });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`A Evolution não configurou o retorno da conexão (${response.status})${providerMessage(payload) ? `: ${providerMessage(payload)}` : "."}`);
}

export async function logoutEvolutionInstance(instanceName: string) {
  const config = requiredEnvironment();
  const response = await fetch(`${config.apiUrl}/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
    headers: { apikey: config.apiKey },
    cache: "no-store",
  });
  // Uma sessão já desconectada pode retornar 400 na Evolution. Ela já está no
  // estado desejado para gerar um novo QR e não deve bloquear o reset.
  if (response.ok || [400, 404].includes(response.status)) return;
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  throw new Error(`A Evolution não encerrou a sessão (${response.status})${providerMessage(payload) ? `: ${providerMessage(payload)}` : "."}`);
}

export async function enableEvolutionHistorySync(instanceName: string) {
  const config = requiredEnvironment();
  const headers = { apikey: config.apiKey, "content-type": "application/json" };
  const currentResponse = await fetch(`${config.apiUrl}/settings/find/${encodeURIComponent(instanceName)}`, { headers, cache: "no-store" });
  const current = await currentResponse.json().catch(() => ({})) as Record<string, unknown>;
  if (!currentResponse.ok) throw new Error(`A Evolution não confirmou as configurações da instância (${currentResponse.status}).`);
  if (current.syncFullHistory === true) return;
  const response = await fetch(`${config.apiUrl}/settings/set/${encodeURIComponent(instanceName)}`, { method: "POST", headers, body: JSON.stringify({ ...current, syncFullHistory: true }), cache: "no-store" });
  if (!response.ok) throw new Error(`A Evolution não ativou a sincronização de conversas (${response.status}).`);
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
