import { createHash } from "node:crypto";
import { getAuthContext } from "@/lib/auth/session";
import { canViewModule } from "@/lib/permissions";
import { arenaDatabase } from "@/lib/arena-database";
import { refreshLoyaltyNotifications } from "@/lib/services/refresh-loyalty-notifications";
import { loyaltyNotificationType } from "@/lib/services/client-loyalty-notifications";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.arenaId)
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  const canSee = (module: "players" | "pos" | "teachers" | "students") =>
    canViewModule(
      module,
      auth.arenaRole,
      auth.systemRole,
      auth.viewPermissions,
    );
  const types = canSee("pos")
    ? ["COMANDA_OPEN_REQUEST", "COMANDA_REQUEST", "COMANDA_CLOSE_REQUEST"]
    : [];
  const comandaOnly = new URL(request.url).searchParams.get("scope") === "comandas";
  if (!comandaOnly && (canSee("teachers") || canSee("students"))) types.push("LESSON_CREDIT_REQUEST", "LESSON_MAKEUP_REQUEST");
  if (!comandaOnly && canSee("players")) {
    await refreshLoyaltyNotifications(auth.arenaId);
    types.push(loyaltyNotificationType);
  }
  const notifications = types.length
    ? await arenaDatabase(auth.arenaId).arenaNotification.findMany({
        where: { arenaId: auth.arenaId, readAt: null, type: { in: types } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          title: true,
          message: true,
          href: true,
          createdAt: true,
        },
      })
    : [];
  const comandaRequestCount = canSee("pos")
    ? await arenaDatabase(auth.arenaId).arenaNotification.count({
        where: {
          arenaId: auth.arenaId,
          readAt: null,
          type: {
            in: [
              "COMANDA_OPEN_REQUEST",
              "COMANDA_REQUEST",
              "COMANDA_CLOSE_REQUEST",
            ],
          },
        },
      })
    : 0;
  const etag = `"${createHash("sha256").update(JSON.stringify({ notifications, comandaRequestCount })).digest("hex")}"`;
  const headers = { "Cache-Control": "private, no-store", ETag: etag };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return Response.json({ notifications, comandaRequestCount }, { headers });
}
