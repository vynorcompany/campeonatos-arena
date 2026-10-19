import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guards";
import { mercadoPagoAuthorizationUrl } from "@/lib/payments/mercado-pago-oauth";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission("finance:settings:manage");
    return NextResponse.redirect(mercadoPagoAuthorizationUrl(auth.arenaId, auth.userId));
  } catch (error) {
    const url = new URL("/financeiro/configuracoes/pagamentos-online", request.url);
    url.searchParams.set("connectionError", error instanceof Error ? error.message : "Não foi possível iniciar a conexão.");
    return NextResponse.redirect(url);
  }
}
