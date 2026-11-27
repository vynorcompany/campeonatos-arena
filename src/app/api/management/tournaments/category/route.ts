import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { resolveTournamentCategoryWorkspace } from "@/lib/backend/services/tournament-category-workspace";
import { tournamentCategoryQuerySchema } from "@/lib/backend/contracts/tournament-category-workspace";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess(), headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 if (!canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions) || !["tournaments:manage","tournaments:results"].some(permission => canPerformPermission(permission, auth.arenaRole, auth.systemRole, auth.editPermissions))) return NextResponse.json({ error: "Sem permissão para consultar a categoria." }, { status: 403, headers });
 const search = request.nextUrl.searchParams;
 if ([...search.keys()].some(key => search.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 const query = tournamentCategoryQuerySchema.safeParse(Object.fromEntries(search));
 if (!query.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 try { return NextResponse.json(await resolveTournamentCategoryWorkspace(query.data), { headers }); }
 catch { return NextResponse.json({ error: "Não foi possível consultar a categoria." }, { status: 503, headers }); }
}
