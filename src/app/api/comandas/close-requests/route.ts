import { getAuthContext } from "@/lib/auth/session";
import { canViewModule } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await getAuthContext();
  if (!auth?.arenaId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!canViewModule("pos", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return Response.json({ error: "Sem acesso." }, { status: 403 });
  const result = await arenaDatabase(auth.arenaId).comanda.aggregate({ where: { arenaId: auth.arenaId, status: "OPEN", closeRequestedAt: { not: null } }, _count: { id: true }, _max: { closeRequestedAt: true } });
  return Response.json({ revision: `${result._count.id}:${result._max.closeRequestedAt?.toISOString() ?? ""}` }, { headers: { "Cache-Control": "private, no-store" } });
}
