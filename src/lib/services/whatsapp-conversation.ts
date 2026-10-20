import crypto from "node:crypto";
import { withArenaTransaction } from "@/lib/rls";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";
import { readWhatsAppReactions, withWhatsAppReaction } from "@/lib/whatsapp-message-data";

export type OutboundWhatsAppMessage = {
  providerId: string;
  body: string;
  sentAt: Date;
  senderUserId: string;
  senderName: string;
  quotedProviderId?: string;
  quotedBody?: string;
  quotedAuthor?: string;
  mediaType?: string;
  mediaMimeType?: string;
  mediaUrl?: string;
};

function providerIdFrom(delivery: unknown) {
  const record = delivery && typeof delivery === "object" ? delivery as Record<string, unknown> : {};
  const key = record.key && typeof record.key === "object" ? record.key as Record<string, unknown> : {};
  const data = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  const dataKey = data.key && typeof data.key === "object" ? data.key as Record<string, unknown> : {};
  return String(key.id ?? dataKey.id ?? record.id ?? `out-${crypto.randomUUID()}`);
}

export function getEvolutionProviderId(delivery: unknown) {
  return providerIdFrom(delivery);
}

export async function getArenaWhatsAppConversation(arenaId: string, conversationId: string) {
  const accountJid = await getActiveWhatsAppAccountJid(arenaId);
  if (!accountJid) return null;
  return withArenaTransaction(arenaId, (tx) => tx.whatsAppConversation.findFirst({
    where: { id: conversationId, arenaId, accountJid },
    select: { id: true, contactPhone: true, remoteJid: true },
  }));
}

export async function persistOutboundWhatsAppMessage(
  arenaId: string,
  conversationId: string,
  message: OutboundWhatsAppMessage,
) {
  const accountJid = await getActiveWhatsAppAccountJid(arenaId);
  if (!accountJid) throw new Error("O WhatsApp da arena não está conectado.");
  return withArenaTransaction(arenaId, async (tx) => {
    // Mantém a mesma ordem de bloqueio do webhook: conversa antes da mensagem.
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "WhatsAppConversation" WHERE "id" = ${conversationId} AND "arenaId" = ${arenaId} AND "accountJid" = ${accountJid} FOR UPDATE`;
    if (!locked.length) throw new Error("Conversa não pertence ao WhatsApp conectado.");
    const conversation = await tx.whatsAppConversation.findFirst({ where: { id: conversationId, arenaId, accountJid }, select: { lastMessageAt: true } });
    if (!conversation) throw new Error("Conversa não pertence ao WhatsApp conectado.");
    const stored = await tx.whatsAppMessage.upsert({
      where: { conversationId_providerId: { conversationId, providerId: message.providerId } },
      select: { id: true, direction: true, body: true, senderName: true, quotedProviderId: true, quotedBody: true, quotedAuthor: true, reactions: true, mediaType: true, mediaMimeType: true, sentAt: true },
      create: {
        providerId: message.providerId,
        conversationId,
        direction: "OUTBOUND",
        body: message.body,
        senderUserId: message.senderUserId,
        senderName: message.senderName,
        quotedProviderId: message.quotedProviderId ?? "",
        quotedBody: message.quotedBody ?? "",
        quotedAuthor: message.quotedAuthor ?? "",
        mediaType: message.mediaType ?? "",
        mediaMimeType: message.mediaMimeType ?? "",
        mediaUrl: message.mediaUrl ?? "",
        sentAt: message.sentAt,
      },
      update: {
        direction: "OUTBOUND",
        body: message.body,
        senderUserId: message.senderUserId,
        senderName: message.senderName,
        quotedProviderId: message.quotedProviderId ?? "",
        quotedBody: message.quotedBody ?? "",
        quotedAuthor: message.quotedAuthor ?? "",
        mediaType: message.mediaType ?? "",
        mediaMimeType: message.mediaMimeType ?? "",
        mediaUrl: message.mediaUrl ?? "",
        sentAt: message.sentAt,
      },
    });
    // Uma resposta pode chegar pelo webhook enquanto a Evolution confirma o
    // envio. Nesse caso, não apague a mensagem não lida nem a coloque atrás
    // da resposta só porque a gravação local terminou depois.
    const newerInbound = await tx.whatsAppMessage.findFirst({
      where: { conversationId, direction: "INBOUND", createdAt: { gte: message.sentAt } },
      select: { id: true },
    });
    await tx.whatsAppConversation.updateMany({
      where: { id: conversationId, arenaId, accountJid },
      data: {
        updatedAt: new Date(),
        ...(!newerInbound ? { unreadCount: 0 } : {}),
        ...(!newerInbound && stored.sentAt > conversation.lastMessageAt ? { lastMessageAt: stored.sentAt } : {}),
      },
    });
    return {
      id: stored.id,
      direction: stored.direction,
      body: stored.body,
      senderName: stored.senderName,
      quotedProviderId: stored.quotedProviderId,
      quotedBody: stored.quotedBody,
      quotedAuthor: stored.quotedAuthor,
      reactions: readWhatsAppReactions(stored.reactions),
      mediaType: stored.mediaType,
      mediaMimeType: stored.mediaMimeType,
      mediaUrl: "",
      sentAt: stored.sentAt.toISOString(),
    };
  });
}

export async function persistWhatsAppReaction(arenaId: string, accountJid: string, remoteJid: string, providerId: string, actorJid: string, emoji: string) {
  if (!remoteJid) return null;
  return withArenaTransaction(arenaId, async (tx) => {
    const target = await tx.whatsAppMessage.findFirst({ where: { providerId, conversation: { arenaId, accountJid, remoteJid } }, select: { id: true, conversationId: true } });
    if (!target) return null;
    await tx.$queryRaw`SELECT "id" FROM "WhatsAppMessage" WHERE "id" = ${target.id} FOR UPDATE`;
    const message = await tx.whatsAppMessage.findUniqueOrThrow({ where: { id: target.id }, select: { reactions: true } });
    const reactions = withWhatsAppReaction(message.reactions, actorJid, emoji);
    await tx.whatsAppMessage.update({ where: { id: target.id }, data: { reactions } });
    await tx.whatsAppConversation.update({ where: { id: target.conversationId }, data: { updatedAt: new Date() } });
    return reactions;
  });
}
