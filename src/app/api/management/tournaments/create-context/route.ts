import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission, canViewModule } from "@/lib/permissions";
import { resolveTournamentCreateOptions, resolveTournamentCategoryCreateContext } from "@/lib/backend/services/tournament-create-context";
export const dynamic = "force-dynamic";
const querySchema = z.discriminatedUnion("view", [z.object({ view: z.literal("event") }).strict(), z.object({ view: z.literal("category"), tournamentId: z.string().min(1).max(200) }).strict()]);
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess(), headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 if (!canViewModule("tournaments", auth.arenaRole, auth.systemRole, auth.viewPermissions) || !canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: "Sem permissão para gerenciar eventos." }, { status: 403, headers });
 const search = request.nextUrl.searchParams;
 if ([...search.keys()].some(key => search.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 const parsed = querySchema.safeParse(Object.fromEntries(search));
 if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 try { return NextResponse.json(await (parsed.data.view === "event" ? resolveTournamentCreateOptions() : resolveTournamentCategoryCreateContext(parsed.data.tournamentId)), { headers }); }
 catch { return NextResponse.json({ error: "Não foi possível consultar o formulário do evento." }, { status: 503, headers }); }
}
