import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canViewModule } from "@/lib/permissions";
import { resolveTournamentRankingWorkspace } from "@/lib/backend/services/tournament-ranking-workspace";
import { tournamentRankingQuerySchema } from "@/lib/backend/contracts/tournament-ranking-workspace";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess(), headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 if (!canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return NextResponse.json({ error: "Sem permissão para consultar rankings." }, { status: 403, headers });
 const search = request.nextUrl.searchParams;
 if ([...search.keys()].some(key => search.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 const query = tournamentRankingQuerySchema.safeParse(Object.fromEntries(search));
 if (!query.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 try { return NextResponse.json(await resolveTournamentRankingWorkspace(query.data), { headers }); }
 catch { return NextResponse.json({ error: "Não foi possível consultar o ranking." }, { status: 503, headers }); }
}
