import { NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleView("support");
  const latest = await prisma.whatsAppMessage.findFirst({
    where: { conversation: { arenaId: auth.arenaId } },
    orderBy: { createdAt: "desc" },
    select: { id: true, conversationId: true, createdAt: true }
  });
  return NextResponse.json({ version: latest ? `${latest.conversationId}:${latest.id}:${latest.createdAt.getTime()}` : "empty" }, { headers: { "cache-control": "no-store, no-cache, max-age=0, must-revalidate" } });
}
