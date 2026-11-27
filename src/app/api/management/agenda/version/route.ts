import { NextRequest, NextResponse } from "next/server";
import { getArenaAccessDecision } from "@/lib/backend/services/management-session";
import { canViewModule } from "@/lib/permissions";
import { agendaDayInputSchema } from "@/lib/backend/contracts/agenda-day";
import { resolveAgendaVersion } from "@/lib/backend/services/agenda-queries";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const decision = await getArenaAccessDecision();
  const auth = decision.auth;
  if (!auth) return NextResponse.json({ error: decision.redirectTo === "/login" ? "Não autenticado." : "Acesso à arena indisponível." }, { status: decision.redirectTo === "/login" ? 401 : 403, headers });
  if (!canViewModule("calendar", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return NextResponse.json({ error: "Sem acesso à grade." }, { status: 403, headers });
  const query = request.nextUrl.searchParams;
  const parsed = agendaDayInputSchema.safeParse(Object.fromEntries(query));
  if (!parsed.success || [...query.keys()].some(key => query.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
  const result = await resolveAgendaVersion(auth.arenaId, parsed.data.date);
  return NextResponse.json(result, { headers });
}
