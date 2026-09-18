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

export function createEvolutionInstanceName(arenaId: string) {
  return `arena-${arenaId.replace(/[^a-z0-9]/gi, "").slice(-18).toLowerCase()}`;
}

export function createEvolutionInstanceToken() { return crypto.randomUUID(); }
export function createEvolutionWebhookSecret() { return crypto.randomBytes(24).toString("base64url"); }

export async function createEvolutionInstance(input: { instanceName: string; instanceToken: string; webhookSecret: string }) {
  const config = requiredEnvironment();
  const webhookUrl = `${config.appUrl}/api/integrations/evolution/webhook?instance=${encodeURIComponent(input.instanceName)}&secret=${encodeURIComponent(input.webhookSecret)}`;
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
      webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: true, events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"] }
  });
  if (!response.ok && response.status === 400) response = await request({ instanceName: input.instanceName, token: input.instanceToken, qrcode: true, integration: "WHATSAPP-BAILEYS", webhook: webhookUrl, webhook_by_events: false, events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"] });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`A Evolution não criou a instância (${response.status}).`);
  const qrcode = payload.qrcode as Record<string, unknown> | undefined;
  return { qrCodeDataUrl: qrDataUrl(qrcode?.base64 ?? payload.base64 ?? payload.qrcode) };
}

export async function getEvolutionQrCode(instanceName: string, instanceToken: string) {
  const config = requiredEnvironment();
  const response = await fetch(`${config.apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, { headers: { apikey: instanceToken }, cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(`A Evolution não disponibilizou o QR Code (${response.status}).`);
  const qrcode = payload.qrcode as Record<string, unknown> | undefined;
  return qrDataUrl(qrcode?.base64 ?? payload.base64 ?? payload.code);
}
