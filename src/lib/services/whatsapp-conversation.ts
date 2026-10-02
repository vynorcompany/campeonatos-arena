import crypto from "node:crypto";
import { withArenaTransaction } from "@/lib/rls";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";

export type OutboundWhatsAppMessage = {
  providerId: string;
  body: string;
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
    const conversation = await tx.whatsAppConversation.findFirst({ where: { id: conversationId, arenaId, accountJid }, select: { id: true } });
    if (!conversation) throw new Error("Conversa não pertence ao WhatsApp conectado.");
    const sentAt = new Date();
    const stored = await tx.whatsAppMessage.upsert({
      where: { providerId: message.providerId },
      create: {
        providerId: message.providerId,
        conversationId,
        direction: "OUTBOUND",
        body: message.body,
        mediaType: message.mediaType ?? "",
        mediaMimeType: message.mediaMimeType ?? "",
        mediaUrl: message.mediaUrl ?? "",
        sentAt,
      },
      update: {
        direction: "OUTBOUND",
        body: message.body,
        mediaType: message.mediaType ?? "",
        mediaMimeType: message.mediaMimeType ?? "",
        mediaUrl: message.mediaUrl ?? "",
      },
    });
    await tx.whatsAppConversation.updateMany({
      where: { id: conversationId, arenaId, accountJid },
      data: { lastMessageAt: sentAt, unreadCount: 0 },
    });
    return {
      id: stored.id,
      direction: stored.direction,
      body: stored.body,
      mediaType: stored.mediaType,
      mediaMimeType: stored.mediaMimeType,
      mediaUrl: stored.mediaUrl,
      sentAt: stored.sentAt.toISOString(),
    };
  });
}
