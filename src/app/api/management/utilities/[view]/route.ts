import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireArenaAccess } from "@/lib/backend/services/management-session";
import { resolveAccessUnavailable, resolvePrinterTest } from "@/lib/backend/services/management-utilities";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ view: string }> }) {
  await requireAuth();
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const view = (await context.params).view;
  if (!["access", "printer"].includes(view)) return NextResponse.json({ error: "Seção inválida." }, { status: 404, headers });
  if ([...request.nextUrl.searchParams.keys()].length) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
  if (view === "printer") await requireArenaAccess();
  try {
    return NextResponse.json(await (view === "access" ? resolveAccessUnavailable() : resolvePrinterTest()), { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar as informações da arena." }, { status: 503, headers });
  }
}
