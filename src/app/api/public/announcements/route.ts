import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { arenaDatabase } from "@/lib/arena-database";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await getPublicPlayerAuth(url.searchParams.get("arena") ?? "");
  const headers = { "Cache-Control": "private, no-store" };
  if (!auth) return Response.json({ error: "Entre na sua conta para consultar os avisos." }, { status: 401, headers });
  const db = arenaDatabase(auth.arenaId);
  const cursorId = url.searchParams.get("cursor");
  const cursor = cursorId ? await db.portalAnnouncement.findFirst({ where: { id: cursorId, arenaId: auth.arenaId }, select: { id: true, pinned: true, createdAt: true } }) : null;
  if (cursorId && !cursor) return Response.json({ error: "Atualize o feed para continuar." }, { status: 400, headers });
  const now = instantToArenaWallClock(new Date());
  const items = await db.portalAnnouncement.findMany({ where: { arenaId: auth.arenaId, active: true, AND: [
    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ...(cursor ? [{ OR: [
      ...(cursor.pinned ? [{ pinned: false }] : []),
      { pinned: cursor.pinned, createdAt: { lt: cursor.createdAt } },
      { pinned: cursor.pinned, createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ] }] : []),
  ] }, orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 13,
    select: { id: true, title: true, message: true, pinned: true, linkUrl: true, createdAt: true } });
  return Response.json({ items: items.slice(0, 12), nextCursor: items.length > 12 ? items[11].id : null }, { headers });
}
