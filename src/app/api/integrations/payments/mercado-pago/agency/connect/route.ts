import { NextResponse } from "next/server";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { mercadoPagoAuthorizationUrl } from "@/lib/payments/mercado-pago-oauth";

export async function GET(request: Request) {
  try {
    const auth = await requireAgencyAccess();
    if (auth.systemRole !== "ADMIN" && auth.systemRole !== "SUPER_ADMIN") throw new Error("Sem permissão para conectar o Mercado Pago da agência.");
    return NextResponse.redirect(mercadoPagoAuthorizationUrl("agency-platform"));
  } catch (error) {
    const url = new URL("/agencia/planos", request.url);
    url.searchParams.set("connectionError", error instanceof Error ? error.message : "Não foi possível iniciar a conexão.");
    return NextResponse.redirect(url);
  }
}
