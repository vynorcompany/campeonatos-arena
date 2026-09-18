import { WhatsAppChatWorkspace } from "@/components/whatsapp/whatsapp-chat-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function WhatsAppPage() {
  const auth = await requireModuleView("support");
  const [connection, conversations] = await Promise.all([prisma.whatsAppConnection.findUnique({ where: { arenaId: auth.arenaId }, select: { status: true } }), prisma.whatsAppConversation.findMany({ where: { arenaId: auth.arenaId }, include: { messages: { orderBy: { sentAt: "asc" }, take: 120 } }, orderBy: { lastMessageAt: "desc" }, take: 100 })]);
  return <div className="stack-md whatsapp-page"><WhatsAppChatWorkspace connected={connection?.status === "CONNECTED"} conversations={conversations.map((conversation) => ({ ...conversation, lastMessageAt: conversation.lastMessageAt.toISOString(), messages: conversation.messages.map((message) => ({ ...message, sentAt: message.sentAt.toISOString() })) }))} /></div>;
}
