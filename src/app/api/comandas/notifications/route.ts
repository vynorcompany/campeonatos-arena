import { getAuthContext } from "@/lib/auth/session";
import { canViewModule } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await getAuthContext();
  if (!auth?.arenaId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!canViewModule("pos", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return Response.json({ notifications: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const notifications = await arenaDatabase(auth.arenaId).arenaNotification.findMany({ where: { arenaId: auth.arenaId, readAt: null, type: { in: ["COMANDA_OPEN_REQUEST", "COMANDA_REQUEST", "COMANDA_CLOSE_REQUEST"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: { id: true, title: true, message: true, href: true, createdAt: true } });
  return Response.json({ notifications }, { headers: { "Cache-Control": "private, no-store" } });
}
