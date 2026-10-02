import { NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleView("support");
  const accountJid = await getActiveWhatsAppAccountJid(auth.arenaId);
  if (!accountJid) return NextResponse.json({ version: "empty", unreadCount: 0 }, { headers: { "cache-control": "no-store" } });
  const where = { arenaId: auth.arenaId, accountJid };
  const [latest, unread] = await Promise.all([prisma.whatsAppConversation.findFirst({
    where,
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true }
  }), prisma.whatsAppConversation.aggregate({ where, _sum: { unreadCount: true } })]);
  return NextResponse.json({ version: `${accountJid}:${latest ? `${latest.id}:${latest.updatedAt.getTime()}` : "empty"}`, unreadCount: unread._sum.unreadCount ?? 0 }, { headers: { "cache-control": "no-store, no-cache, max-age=0, must-revalidate" } });
}
