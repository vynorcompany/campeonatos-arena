import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { resolveTournamentCategories, resolveTournamentGames, resolveTournamentOverview } from "@/lib/backend/services/tournament-workspaces";
import { tournamentWorkspaceQuerySchema } from "@/lib/backend/contracts/tournament-workspaces";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess(), headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 if (!canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions) || !canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: "Sem permissão para gerenciar eventos." }, { status: 403, headers });
 const search = request.nextUrl.searchParams;
 if ([...search.keys()].some(key => search.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 const query = tournamentWorkspaceQuerySchema.safeParse(Object.fromEntries(search));
 if (!query.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 try { return NextResponse.json(query.data.view === "categories" ? await resolveTournamentCategories(query.data.tournamentId) : query.data.view === "games" ? await resolveTournamentGames(query.data.tournamentId) : await resolveTournamentOverview(query.data.tournamentId), { headers }); }
 catch { return NextResponse.json({ error: "Não foi possível consultar o evento." }, { status: 503, headers }); }
}
