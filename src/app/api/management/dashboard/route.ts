import { NextRequest, NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { dashboardQuerySchema } from "@/lib/backend/contracts/dashboard";
import { resolveDashboardOverview } from "@/lib/backend/services/dashboard";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await requireModuleView('dashboard');
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const query = dashboardQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveDashboardOverview(auth.arenaId, query.data), { headers });
}
