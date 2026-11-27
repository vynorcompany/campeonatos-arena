import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canViewModule } from "@/lib/permissions";
import { resolveWhatsAppWorkspace } from "@/lib/backend/services/whatsapp-workspace";
import { whatsappWorkspaceQuerySchema } from "@/lib/backend/contracts/whatsapp-workspace";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess(), headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 if (!canViewModule("support", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return NextResponse.json({ error: "Sem permissão para consultar conversas." }, { status: 403, headers });
 const search = request.nextUrl.searchParams;
 if ([...search.keys()].some(key => search.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 const parsed = whatsappWorkspaceQuerySchema.safeParse(Object.fromEntries(search));
 if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
 try { return NextResponse.json(await resolveWhatsAppWorkspace(parsed.data.conversa ?? ""), { headers }); }
 catch { return NextResponse.json({ error: "Não foi possível consultar as conversas do WhatsApp." }, { status: 503, headers }); }
}
