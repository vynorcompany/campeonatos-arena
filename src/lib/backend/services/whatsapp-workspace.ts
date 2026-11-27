import "server-only";
import type { Prisma } from "@prisma/client";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";
import { readWhatsAppReactions } from "@/lib/whatsapp-message-data";
import { whatsappWorkspaceSchema } from "../contracts/whatsapp-workspace";
export async function resolveWhatsAppWorkspace(requestedConversation: string) {
  const auth = await requireModuleView("support");
  const [arena, connection, clients] = await Promise.all([
    prisma.arena.findUniqueOrThrow({ where: { id: auth.arenaId }, select: { whatsappSlaMinutes: true } }),
    arenaDatabase(auth.arenaId).whatsAppConnection.findUnique({ where: { arenaId: auth.arenaId }, select: { status: true, connectedPhone: true, inboxRevision: true } }),
    arenaDatabase(auth.arenaId).player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true, email: true, photoUrl: true }, orderBy: { name: "asc" }, take: 500 })
  ]);
  const accountJid = connection?.status === "CONNECTED" ? normalizeWhatsAppAccountJid(connection.connectedPhone) : "";
  const select = {
        id: true, contactName: true, contactPhone: true, profilePhotoUrl: true,
        unreadCount: true, lastMessageAt: true, slaResolvedAt: true,
        playerId: true, archivedAt: true, pinned: true, favorite: true,
        listName: true, remoteJid: true,
        player: { select: { id: true, name: true, phone: true, email: true, photoUrl: true } },
        messages: {
          orderBy: { sentAt: "desc" }, take: 1,
          select: { id: true, direction: true, body: true, senderName: true, participantJid: true, quotedProviderId: true, quotedBody: true, quotedAuthor: true, reactions: true, mediaType: true, mediaMimeType: true, mediaFileName: true, sentAt: true },
        },
      } satisfies Prisma.WhatsAppConversationSelect;
  const conversations = accountJid ? await arenaDatabase(auth.arenaId).whatsAppConversation.findMany({
      where: { arenaId: auth.arenaId, accountJid }, select,
      orderBy: { lastMessageAt: "desc" }, take: 100,
    }) : [];
  const selected = accountJid && requestedConversation ? await arenaDatabase(auth.arenaId).whatsAppConversation.findFirst({ where: { id: requestedConversation, arenaId: auth.arenaId, accountJid }, select }) : null;
  if (selected && !conversations.some(conversation => conversation.id === selected.id)) conversations.unshift(selected);
  const serializedConversations = conversations.map((conversation) => ({ ...conversation, contactName: !conversation.remoteJid.endsWith("@g.us") && conversation.player?.name ? conversation.player.name : conversation.contactName, lastMessageAt: conversation.lastMessageAt.toISOString(), archivedAt: conversation.archivedAt?.toISOString() ?? null, slaResolvedAt: conversation.slaResolvedAt?.toISOString() ?? null, messages: conversation.messages.map((message) => ({ ...message, mediaUrl: "", reactions: readWhatsAppReactions(message.reactions).map(({ actorJid, emoji }) => ({ actorJid, emoji })), sentAt: message.sentAt.toISOString() })) }));
  const initialVersion = accountJid ? `${accountJid}:${connection!.inboxRevision.toString()}` : "empty";
  return whatsappWorkspaceSchema.parse({ selectedConversationId: selected?.id ?? "", currentAccountJid: accountJid, connected: connection?.status === "CONNECTED", initialVersion, slaMinutes: arena.whatsappSlaMinutes, clients, conversations: serializedConversations });
}
