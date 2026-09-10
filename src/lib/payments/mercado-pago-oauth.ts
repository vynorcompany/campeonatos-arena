import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

const stateLifetimeMs = 10 * 60 * 1000;

function stateKey() {
  const key = process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY?.trim();
  if (!key) throw new Error("Conectores de pagamento indisponíveis: chave de criptografia não configurada.");
  return key;
}

export function mercadoPagoCallbackUrl() {
  if (!env.appUrl) throw new Error("APP_URL não configurada para conectar o Mercado Pago.");
  return new URL("/api/integrations/payments/mercado-pago/callback", env.appUrl).toString();
}

export function createMercadoPagoOAuthState(arenaId: string) {
  const payload = `${arenaId}.${Date.now()}.${randomBytes(18).toString("base64url")}`;
  const signature = createHmac("sha256", stateKey()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function readMercadoPagoOAuthState(state: string) {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("Retorno de conexão inválido.");
  const expected = createHmac("sha256", stateKey()).update(Buffer.from(encoded, "base64url").toString("utf8")).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Retorno de conexão não autorizado.");
  const [arenaId, issuedAt] = Buffer.from(encoded, "base64url").toString("utf8").split(".");
  if (!arenaId || !issuedAt || Date.now() - Number(issuedAt) > stateLifetimeMs) throw new Error("A solicitação de conexão expirou. Tente novamente.");
  return arenaId;
}

export function mercadoPagoAuthorizationUrl(arenaId: string) {
  if (!env.mercadoPagoClientId) throw new Error("Mercado Pago não habilitado pela plataforma.");
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", env.mercadoPagoClientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", mercadoPagoCallbackUrl());
  url.searchParams.set("state", createMercadoPagoOAuthState(arenaId));
  return url.toString();
}

export async function exchangeMercadoPagoAuthorizationCode(code: string) {
  if (!env.mercadoPagoClientId || !env.mercadoPagoClientSecret) throw new Error("Mercado Pago não habilitado pela plataforma.");
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: env.mercadoPagoClientId, client_secret: env.mercadoPagoClientSecret, grant_type: "authorization_code", code, redirect_uri: mercadoPagoCallbackUrl() }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Não foi possível autorizar a conta do Mercado Pago.");
  return response.json() as Promise<{ access_token: string; refresh_token?: string; user_id?: string | number; expires_in?: number; public_key?: string }>;
}
