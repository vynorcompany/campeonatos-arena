import { z } from "zod";
const client = z.object({ id: z.string(), name: z.string(), phone: z.string(), email: z.string(), photoUrl: z.string() }).strict();
const message = z.object({
 id: z.string(), direction: z.string(), body: z.string(), senderName: z.string(), participantJid: z.string(),
 quotedProviderId: z.string(), quotedBody: z.string(), quotedAuthor: z.string(),
 reactions: z.array(z.object({ actorJid: z.string(), emoji: z.string() }).strict()),
 mediaType: z.string(), mediaMimeType: z.string(), mediaFileName: z.string(), mediaUrl: z.literal(""), sentAt: z.iso.datetime(),
}).strict();
const conversation = z.object({
 id: z.string(), contactName: z.string(), contactPhone: z.string(), profilePhotoUrl: z.string(), unreadCount: z.number().int().nonnegative(),
 lastMessageAt: z.iso.datetime(), slaResolvedAt: z.iso.datetime().nullable(), playerId: z.string().nullable(), player: client.nullable(),
 archivedAt: z.iso.datetime().nullable(), pinned: z.boolean(), favorite: z.boolean(), listName: z.string(), remoteJid: z.string(), messages: z.array(message).max(1),
}).strict();
export const whatsappWorkspaceSchema = z.object({
 selectedConversationId: z.string(), currentAccountJid: z.string(), connected: z.boolean(), initialVersion: z.string(), slaMinutes: z.number().int(),
 clients: z.array(client).max(500), conversations: z.array(conversation).max(101),
}).strict();
export const whatsappWorkspaceQuerySchema = z.object({ conversa: z.string().max(100).optional() }).strict();
