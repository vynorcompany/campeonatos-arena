import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getEvolutionGroupName, getEvolutionProfilePicture } from "@/lib/integrations/evolution/client";
import { hashWebhookSecret } from "@/lib/payments/connection-secrets";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";
import { findEvolutionInstance } from "@/lib/integrations/evolution/agency";
import { persistWhatsAppReaction } from "@/lib/services/whatsapp-conversation";
import { readEvolutionGroupName } from "@/lib/integrations/evolution/groups";
import { withArenaTransaction } from "@/lib/rls";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function nestedValue(payload: Record<string, unknown>, key: string) {
  const data = payload.data;
  return payload[key] ?? (data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function mediaDetails(message: Record<string, unknown>) {
  const candidates: Array<[string, Record<string, unknown>]> = [
    ["IMAGE", toRecord(message.imageMessage)],
    ["AUDIO", toRecord(message.audioMessage)],
    ["VIDEO", toRecord(message.videoMessage)],
    ["DOCUMENT", toRecord(message.documentMessage)],
    ["STICKER", toRecord(message.stickerMessage)]
  ];
  const entry = candidates.find(([, value]) => Object.keys(value).length > 0);
  if (!entry) return { type: "", mimeType: "", url: "" };
  const [type, value] = entry;
  return { type, mimeType: String(value.mimetype ?? ""), url: String(value.url ?? "") };
}

function messageBody(message: Record<string, unknown>, media: ReturnType<typeof mediaDetails>) {
  const text = String(message.conversation ?? toRecord(message.extendedTextMessage).text ?? toRecord(message.imageMessage).caption ?? toRecord(message.videoMessage).caption ?? toRecord(message.documentMessage).caption ?? "").trim();
  if (text) return text;
  if (media.type === "IMAGE") return "Imagem";
  if (media.type === "AUDIO") return "Áudio";
  if (media.type === "VIDEO") return "Vídeo";
  if (media.type === "DOCUMENT") return "Documento";
  if (media.type === "STICKER") return "Figurinha";
  return "Mensagem recebida";
}

function sentAtFrom(data: Record<string, unknown>) {
  const raw = Number(data.messageTimestamp ?? data.timestamp ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return new Date();
  return new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const record = payload as Record<string, unknown>;
  const instanceName = String(request.nextUrl.searchParams.get("instance") ?? nestedValue(record, "instance") ?? nestedValue(record, "instanceName") ?? "");
  const payloadInstance = String(nestedValue(record, "instance") ?? nestedValue(record, "instanceName") ?? "").trim();
  const secret = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-evolution-webhook-secret") ?? "";
  if (!instanceName || !secret || (payloadInstance && payloadInstance !== instanceName)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connection = await prisma.whatsAppConnection.findUnique({ where: { instanceName } });
  if (!connection || !safeEqual(hashWebhookSecret(secret), connection.webhookSecretHash)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = String(record.event ?? record.type ?? "").toUpperCase();
  const state = String(nestedValue(record, "state") ?? nestedValue(record, "status") ?? "").toUpperCase();
  if (event.includes("CONNECTION") || (!event && ["OPEN", "CONNECTED", "CLOSE", "CLOSED", "DISCONNECTED"].includes(state))) {
    const connected = ["OPEN", "CONNECTED"].includes(state);
    const disconnected = ["CLOSE", "CLOSED", "DISCONNECTED"].includes(state);
    const eventPhone = normalizeWhatsAppAccountJid(String(nestedValue(record, "wuid") ?? nestedValue(record, "phone") ?? ""));
    const providerPhone = connected && !eventPhone ? normalizeWhatsAppAccountJid((await findEvolutionInstance(instanceName).catch(() => null))?.ownerJid ?? "") : "";
    const connectedPhone = connected ? eventPhone || providerPhone : disconnected ? "" : connection.connectedPhone;
    await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { status: connected ? "CONNECTED" : disconnected ? "DISCONNECTED" : connection.status, connectedPhone, qrCodeDataUrl: connected ? "" : connection.qrCodeDataUrl, lastConnectedAt: connected && connectedPhone !== connection.connectedPhone ? new Date() : connection.lastConnectedAt } });
  }

  // Eventos de entrega/leitura também contêm "MESSAGE", mas não trazem uma
  // nova mensagem. Interpretá-los como upsert cria mensagens fantasma.
  if (["MESSAGES_UPSERT", "MESSAGE_UPSERT"].includes(event.replace(/[.\s-]+/g, "_"))) {
    const currentConnection = await prisma.whatsAppConnection.findUnique({ where: { id: connection.id }, select: { connectedPhone: true, status: true } });
    const accountJid = normalizeWhatsAppAccountJid(currentConnection?.connectedPhone ?? "");
    // Never associate history with a tenant inbox until the linked WhatsApp
    // account is known. A new phone must not inherit the previous phone's chats.
    if (currentConnection?.status !== "CONNECTED" || !accountJid) return NextResponse.json({ received: true, ignored: "account-not-confirmed" });
    const data = toRecord(record.data ?? record);
    const claimedOwner = String(data.owner || record.sender || "").trim();
    const eventAccountJid = claimedOwner ? normalizeWhatsAppAccountJid(claimedOwner.includes("@") ? claimedOwner : `${claimedOwner}@s.whatsapp.net`) : "";
    if (eventAccountJid && eventAccountJid !== accountJid) return NextResponse.json({ received: true, ignored: "account-mismatch" });
    const key = toRecord(data.key ?? record.key);
    const remoteJid = String(key.remoteJid ?? data.remoteJid ?? "");
    const fromMe = Boolean(key.fromMe ?? data.fromMe);
    const providerId = String(key.id ?? data.id ?? "");
    const message = toRecord(data.message ?? record.message);
    const reaction = toRecord(message.reactionMessage);
    if (Object.keys(reaction).length) {
      const reactionKey = toRecord(reaction.key);
      const actorJid = fromMe ? accountJid : String(key.participant ?? data.participant ?? remoteJid);
      if (reactionKey.id && actorJid) await persistWhatsAppReaction(connection.arenaId, accountJid, String(reactionKey.id), actorJid, String(reaction.text ?? ""));
      return NextResponse.json({ received: true });
    }
    if (remoteJid && providerId && !remoteJid.endsWith("@broadcast")) {
      const media = mediaDetails(message);
      const isGroup = remoteJid.endsWith("@g.us");
      const senderName = String(data.pushName ?? data.notifyName ?? key.participant ?? data.participant ?? "").trim();
      const eventGroupName = readEvolutionGroupName({ groupName: data.groupName, subject: data.subject, groupSubject: data.groupSubject, groupMetadata: data.groupMetadata }, remoteJid);
      const rawBody = messageBody(message, media);
      const body = isGroup && !fromMe && senderName ? `${senderName}: ${rawBody}` : rawBody;
      const sentAt = sentAtFrom(data);
      const phone = remoteJid.replace(/@.*$/, "");
      const resolvedGroupName = isGroup && !eventGroupName ? await getEvolutionGroupName(remoteJid, connection.arenaId).catch(() => "") : "";
      const contactName = isGroup ? (resolvedGroupName || eventGroupName) : senderName;
      const photoFromEvent = String(data.profilePictureUrl ?? data.profilePicUrl ?? "");
      const conversationKey = { arenaId: connection.arenaId, accountJid, remoteJid };
      const content = [message.extendedTextMessage, message.imageMessage, message.audioMessage, message.videoMessage, message.documentMessage, message.stickerMessage].map(toRecord).find((value) => value.contextInfo);
      const context = toRecord(content?.contextInfo);
      const quotedProviderId = String(context.stanzaId ?? "");
      const quotedMessage = toRecord(context.quotedMessage);
      const original = quotedProviderId ? await arenaDatabase(connection.arenaId).whatsAppMessage.findFirst({ where: { providerId: quotedProviderId, conversation: conversationKey }, select: { body: true, direction: true, senderName: true } }) : null;
      const quotedBody = original?.body ?? (Object.keys(quotedMessage).length ? messageBody(quotedMessage, mediaDetails(quotedMessage)) : "");
      const quotedAuthor = original?.direction === "OUTBOUND" ? original.senderName || "Você" : quotedProviderId ? "Contato" : "";
      const conversation = await withArenaTransaction(connection.arenaId, async (tx) => {
        const current = await tx.whatsAppConversation.upsert({
          where: { arenaId_accountJid_remoteJid: conversationKey },
          create: { ...conversationKey, contactPhone: phone, contactName: contactName || (isGroup ? "Grupo do WhatsApp" : phone), profilePhotoUrl: photoFromEvent, unreadCount: 0, lastMessageAt: sentAt },
          update: { ...((isGroup || !fromMe) && contactName ? { contactName } : {}), ...(!isGroup && photoFromEvent ? { profilePhotoUrl: photoFromEvent } : {}) }
        });
        // Serializa redeliveries desta conversa antes de contar não lidas.
        await tx.$queryRaw`SELECT "id" FROM "WhatsAppConversation" WHERE "id" = ${current.id} AND "arenaId" = ${connection.arenaId} FOR UPDATE`;
        const messageKey = { conversationId: current.id, providerId };
        const existingMessage = await tx.whatsAppMessage.findUnique({ where: { conversationId_providerId: messageKey }, select: { id: true } });
        if (!existingMessage) {
          await tx.whatsAppMessage.upsert({ where: { conversationId_providerId: messageKey }, create: { providerId, conversationId: current.id, direction: fromMe ? "OUTBOUND" : "INBOUND", body, participantJid: String(key.participant ?? data.participant ?? ""), quotedProviderId, quotedBody, quotedAuthor, mediaType: media.type, mediaMimeType: media.mimeType, mediaUrl: media.url, providerPayload: message as Prisma.InputJsonValue, sentAt }, update: {} });
          await tx.whatsAppConversation.update({ where: { id: current.id }, data: { ...(fromMe ? { unreadCount: 0 } : { unreadCount: { increment: 1 } }), lastMessageAt: sentAt } });
        }
        return current;
      });
      if (!conversation.profilePhotoUrl && !remoteJid.endsWith("@g.us")) {
        const profilePhotoUrl = await getEvolutionProfilePicture(remoteJid, connection.arenaId).catch(() => "");
        if (profilePhotoUrl) await arenaDatabase(connection.arenaId).whatsAppConversation.update({ where: { id: conversation.id }, data: { profilePhotoUrl } });
      }
    }
  }
  return NextResponse.json({ received: true, arenaId: connection.arenaId });
}
