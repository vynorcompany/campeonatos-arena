import "server-only";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptConnectionSecrets, encryptConnectionSecrets } from "@/lib/payments/connection-secrets";

export async function getAgencyMercadoPagoToken() {
  const connection = await prisma.agencyPaymentConnection.findUnique({ where: { id: "platform" } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("Conecte o Mercado Pago na visão da agência.");
  const secrets = decryptConnectionSecrets(connection.encryptedSecrets);
  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    if (!secrets.accessToken) throw new Error("A conexão da agência não possui token de acesso.");
    return secrets.accessToken;
  }
  if (!secrets.refreshToken || !env.mercadoPagoClientId || !env.mercadoPagoClientSecret) throw new Error("A conexão do Mercado Pago expirou. Reconecte-a na agência.");
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.mercadoPagoClientId, client_secret: env.mercadoPagoClientSecret, grant_type: "refresh_token", refresh_token: secrets.refreshToken }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("A autorização do Mercado Pago expirou. Reconecte-a na agência.");
  const renewed = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!renewed.access_token) throw new Error("O Mercado Pago não retornou um novo token de acesso.");
  await prisma.agencyPaymentConnection.update({ where: { id: connection.id }, data: {
    encryptedSecrets: encryptConnectionSecrets({ accessToken: renewed.access_token, refreshToken: renewed.refresh_token ?? secrets.refreshToken }),
    expiresAt: renewed.expires_in ? new Date(Date.now() + renewed.expires_in * 1000) : null
  } });
  return renewed.access_token;
}
