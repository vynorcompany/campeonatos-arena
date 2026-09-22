import { NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireModuleView("support");
  const latest = await prisma.whatsAppConversation.findFirst({ where: { arenaId: auth.arenaId }, orderBy: { lastMessageAt: "desc" }, select: { id: true, lastMessageAt: true } });
  return NextResponse.json({ version: latest ? `${latest.id}:${latest.lastMessageAt.getTime()}` : "empty" }, { headers: { "cache-control": "no-store, max-age=0" } });
}
