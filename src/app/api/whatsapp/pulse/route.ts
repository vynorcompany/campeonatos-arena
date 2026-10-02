import { NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleView("support");
  const accountJid = await getActiveWhatsAppAccountJid(auth.arenaId);
  if (!accountJid) return NextResponse.json({ version: "empty" }, { headers: { "cache-control": "no-store" } });
  const latest = await prisma.whatsAppConversation.findFirst({
    where: { arenaId: auth.arenaId, accountJid },
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true }
  });
  return NextResponse.json({ version: latest ? `${latest.id}:${latest.updatedAt.getTime()}` : "empty" }, { headers: { "cache-control": "no-store, no-cache, max-age=0, must-revalidate" } });
}
