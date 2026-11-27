import { NextRequest, NextResponse } from "next/server";
import { getArenaAccessDecision } from "@/lib/backend/services/management-session";
import { canViewModule } from "@/lib/permissions";
import { agendaAvailabilityInputSchema } from "@/lib/backend/contracts/agenda-queries";
import { resolveAgendaAvailability } from "@/lib/backend/services/agenda-queries";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const decision = await getArenaAccessDecision();
  const auth = decision.auth;
  if (!auth) return NextResponse.json({ error: decision.redirectTo === "/login" ? "Não autenticado." : "Acesso à arena indisponível." }, { status: decision.redirectTo === "/login" ? 401 : 403, headers });
  if (!canViewModule("calendar", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return NextResponse.json({ error: "Sem acesso à grade." }, { status: 403, headers });
  const query = request.nextUrl.searchParams;
  const parsed = agendaAvailabilityInputSchema.safeParse(Object.fromEntries(query));
  if (!parsed.success || [...query.keys()].some(key => query.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
  const result = await resolveAgendaAvailability(auth.arenaId, parsed.data);
  if (!result) return NextResponse.json({ error: "Quadra ou reserva não encontrada." }, { status: 404, headers });
  return NextResponse.json(result, { headers });
}
