import { NextRequest, NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";
import { readWhatsAppReactions } from "@/lib/whatsapp-message-data";
export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const auth = await requireModuleView("support");
  const accountJid = await getActiveWhatsAppAccountJid(auth.arenaId);
  const { conversationId } = await params;
  if (!accountJid) return NextResponse.json({ error: "Conversa indisponível." }, { status: 404 });
  const conversation = await prisma.whatsAppConversation.findFirst({ where: { id: conversationId, arenaId: auth.arenaId, accountJid }, select: { id: true, updatedAt: true } });
  if (!conversation) return NextResponse.json({ error: "Conversa indisponível." }, { status: 404 });
  const etag = JSON.stringify("messages:" + conversation.id + ":" + conversation.updatedAt.getTime());
  const headers = { "cache-control": "private, no-cache", etag };
  if (request.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers });
  const messages = await prisma.whatsAppMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { sentAt: "desc" }, take: 120, select: { id: true, direction: true, body: true, senderName: true, participantJid: true, quotedProviderId: true, quotedBody: true, quotedAuthor: true, reactions: true, mediaType: true, mediaMimeType: true, sentAt: true } });
  return NextResponse.json({ messages: messages.map(message => ({ ...message, mediaUrl: "", reactions: readWhatsAppReactions(message.reactions), sentAt: message.sentAt.toISOString() })) }, { headers });
}
