import { NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleView("support");
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { arenaId: auth.arenaId },
    select: { status: true, connectedPhone: true, inboxRevision: true },
  });
  const accountJid = connection?.status === "CONNECTED" ? normalizeWhatsAppAccountJid(connection.connectedPhone) : "";
  if (!accountJid) return NextResponse.json({ version: "empty", unreadCount: 0 }, { headers: { "cache-control": "no-store" } });
  const where = { arenaId: auth.arenaId, accountJid };
  const db = arenaDatabase(auth.arenaId);
  const unread = await db.whatsAppConversation.aggregate({ where, _sum: { unreadCount: true } });
  return NextResponse.json({ version: `${accountJid}:${connection!.inboxRevision.toString()}`, unreadCount: unread._sum.unreadCount ?? 0 }, { headers: { "cache-control": "no-store, no-cache, max-age=0, must-revalidate" } });
}
