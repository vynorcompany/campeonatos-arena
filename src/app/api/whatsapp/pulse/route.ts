import { NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleView("support");
  const accountJid = await getActiveWhatsAppAccountJid(auth.arenaId);
  if (!accountJid) return NextResponse.json({ version: "empty", unreadCount: 0 }, { headers: { "cache-control": "no-store" } });
  const where = { arenaId: auth.arenaId, accountJid };
  const db = arenaDatabase(auth.arenaId);
  const [latest, unread] = await Promise.all([db.whatsAppConversation.findFirst({
    where,
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true }
  }), db.whatsAppConversation.aggregate({ where, _sum: { unreadCount: true } })]);
  return NextResponse.json({ version: `${accountJid}:${latest ? `${latest.id}:${latest.updatedAt.getTime()}` : "empty"}`, unreadCount: unread._sum.unreadCount ?? 0 }, { headers: { "cache-control": "no-store, no-cache, max-age=0, must-revalidate" } });
}
