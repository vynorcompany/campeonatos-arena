import { viewStyles } from "./page.utilities";
import { WhatsAppChatWorkspace } from "@/components/whatsapp/whatsapp-chat-workspace";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";
import { readWhatsAppReactions } from "@/lib/whatsapp-message-data";

export default async function WhatsAppPage() {
  const auth = await requireModuleView("support");
  const [arena, connection, clients] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { whatsappSlaMinutes: true } }),
    prisma.whatsAppConnection.findUnique({ where: { arenaId: auth.arenaId }, select: { status: true, connectedPhone: true } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true, email: true, photoUrl: true }, orderBy: { name: "asc" }, take: 500 })
  ]);
  const accountJid = connection?.status === "CONNECTED" ? normalizeWhatsAppAccountJid(connection.connectedPhone) : "";
  const [conversations, latestUpdate] = accountJid ? await Promise.all([
    prisma.whatsAppConversation.findMany({
      where: { arenaId: auth.arenaId, accountJid },
      select: {
        id: true, contactName: true, contactPhone: true, profilePhotoUrl: true,
        unreadCount: true, lastMessageAt: true, slaResolvedAt: true,
        playerId: true, archivedAt: true, pinned: true, favorite: true,
        listName: true, remoteJid: true,
        player: { select: { id: true, name: true, phone: true, email: true, photoUrl: true } },
        messages: {
          orderBy: { sentAt: "desc" }, take: 120,
          select: { id: true, direction: true, body: true, senderName: true, quotedProviderId: true, quotedBody: true, quotedAuthor: true, reactions: true, mediaType: true, mediaMimeType: true, mediaUrl: true, sentAt: true },
        },
      },
      orderBy: { lastMessageAt: "desc" }, take: 100,
    }),
    prisma.whatsAppConversation.findFirst({
      where: { arenaId: auth.arenaId, accountJid },
      orderBy: { updatedAt: "desc" },
      select: { id: true, updatedAt: true },
    }),
  ]) : [[], null];
  const serializedConversations = conversations.map((conversation) => ({ ...conversation, contactName: !conversation.remoteJid.endsWith("@g.us") && conversation.player?.name ? conversation.player.name : conversation.contactName, lastMessageAt: conversation.lastMessageAt.toISOString(), archivedAt: conversation.archivedAt?.toISOString() ?? null, slaResolvedAt: conversation.slaResolvedAt?.toISOString() ?? null, messages: conversation.messages.map((message) => ({ ...message, reactions: readWhatsAppReactions(message.reactions), sentAt: message.sentAt.toISOString() })) }));
  const initialVersion = latestUpdate ? `${latestUpdate.id}:${latestUpdate.updatedAt.getTime()}` : "empty";
  return <div className={viewStyles.whatsapp_page}><WhatsAppChatWorkspace currentAccountJid={accountJid} currentUserName={auth.userName} connected={connection?.status === "CONNECTED"} initialVersion={initialVersion} slaMinutes={arena.whatsappSlaMinutes} clients={clients} conversations={serializedConversations} /></div>;
}
