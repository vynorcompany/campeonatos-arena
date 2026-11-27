import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { resolveTournamentEventRegistrations, resolveTournamentGeneralRegistrations } from "@/lib/backend/services/tournament-registration-queries";
import { tournamentRegistrationQuerySchema } from "@/lib/backend/contracts/tournament-registration-queries";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess(), headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 if (!canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions) || !canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: "Sem permissão para gerenciar inscrições." }, { status: 403, headers });
 const search = request.nextUrl.searchParams;
 if ([...search.keys()].some(key => search.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 const query = tournamentRegistrationQuerySchema.safeParse(Object.fromEntries(search));
 if (!query.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 try { return NextResponse.json(query.data.view === "event" ? await resolveTournamentEventRegistrations(query.data.tournamentId) : await resolveTournamentGeneralRegistrations(query.data.tournamentId), { headers }); }
 catch { return NextResponse.json({ error: "Não foi possível consultar as inscrições." }, { status: 503, headers }); }
}
