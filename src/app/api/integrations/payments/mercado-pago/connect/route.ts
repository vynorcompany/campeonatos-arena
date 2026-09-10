import { NextResponse } from "next/server";
import { requireModuleEdit } from "@/lib/auth/guards";
import { mercadoPagoAuthorizationUrl } from "@/lib/payments/mercado-pago-oauth";

export async function GET() {
  try {
    const auth = await requireModuleEdit("finance");
    return NextResponse.redirect(mercadoPagoAuthorizationUrl(auth.arenaId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar a conexão." }, { status: 400 });
  }
}
