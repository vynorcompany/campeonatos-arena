import { WhatsAppChatWorkspace } from "@/components/whatsapp/whatsapp-chat-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function WhatsAppPage() {
  const auth = await requireModuleView("support");
  const [arena, connection, conversations, clients] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { whatsappSlaMinutes: true } }),
    prisma.whatsAppConnection.findUnique({ where: { arenaId: auth.arenaId }, select: { status: true } }),
    prisma.whatsAppConversation.findMany({ where: { arenaId: auth.arenaId }, include: { player: { select: { id: true, name: true, phone: true, email: true, photoUrl: true } }, messages: { orderBy: { sentAt: "asc" }, take: 120 } }, orderBy: { lastMessageAt: "desc" }, take: 100 }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true, email: true, photoUrl: true }, orderBy: { name: "asc" }, take: 500 })
  ]);
  return <div className="whatsapp-page"><WhatsAppChatWorkspace connected={connection?.status === "CONNECTED"} slaMinutes={arena.whatsappSlaMinutes} clients={clients} conversations={conversations.map((conversation) => ({ ...conversation, lastMessageAt: conversation.lastMessageAt.toISOString(), archivedAt: conversation.archivedAt?.toISOString() ?? null, messages: conversation.messages.map((message) => ({ ...message, sentAt: message.sentAt.toISOString() })) }))} /></div>;
}
