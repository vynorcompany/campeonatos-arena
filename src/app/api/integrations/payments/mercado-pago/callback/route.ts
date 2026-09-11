import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { encryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { exchangeMercadoPagoAuthorizationCode, getMercadoPagoAccount, readMercadoPagoOAuthState } from "@/lib/payments/mercado-pago-oauth";
import { withArenaTransaction } from "@/lib/rls";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const applicationUrl = env.appUrl ?? url.origin;
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) throw new Error("O Mercado Pago não retornou a autorização esperada.");
    const arenaId = readMercadoPagoOAuthState(state);
    const token = await exchangeMercadoPagoAuthorizationCode(code);
    if (!token.access_token) throw new Error("O Mercado Pago não retornou um token de acesso.");
    const account = await getMercadoPagoAccount(token.access_token);
    await withArenaTransaction(arenaId, (tx) => tx.paymentConnection.upsert({
      where: { arenaId_provider: { arenaId, provider: "MERCADO_PAGO" } },
      create: { arenaId, provider: "MERCADO_PAGO", environment: "PRODUCTION", status: "CONNECTED", displayName: account.displayName || "Mercado Pago", accountReference: account.reference || String(token.user_id ?? ""), encryptedSecrets: encryptConnectionSecrets({ accessToken: token.access_token, refreshToken: token.refresh_token ?? "", publicKey: token.public_key ?? "" }), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, lastValidatedAt: new Date() },
      update: { status: "CONNECTED", displayName: account.displayName || "Mercado Pago", accountReference: account.reference || String(token.user_id ?? ""), encryptedSecrets: encryptConnectionSecrets({ accessToken: token.access_token, refreshToken: token.refresh_token ?? "", publicKey: token.public_key ?? "" }), expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null, lastValidatedAt: new Date(), lastError: "" }
    }));
    return NextResponse.redirect(new URL("/financeiro/configuracoes/pagamentos-online?connected=mercado-pago", applicationUrl));
  } catch (error) {
    return NextResponse.redirect(new URL(`/financeiro/configuracoes/pagamentos-online?connectionError=${encodeURIComponent(error instanceof Error ? error.message : "Não foi possível concluir a conexão.")}`, applicationUrl));
  }
}
