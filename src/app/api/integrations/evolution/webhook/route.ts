import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getEvolutionProfilePicture } from "@/lib/integrations/evolution/client";
import { hashWebhookSecret } from "@/lib/payments/connection-secrets";
import { prisma } from "@/lib/prisma";

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
  const secret = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-evolution-webhook-secret") ?? "";
  if (!instanceName || !secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connection = await prisma.whatsAppConnection.findUnique({ where: { instanceName } });
  if (!connection || !safeEqual(hashWebhookSecret(secret), connection.webhookSecretHash)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = String(record.event ?? record.type ?? "").toUpperCase();
  const state = String(nestedValue(record, "state") ?? nestedValue(record, "status") ?? "").toUpperCase();
  if (event.includes("CONNECTION") || state) {
    const connected = ["OPEN", "CONNECTED"].includes(state);
    const disconnected = ["CLOSE", "CLOSED", "DISCONNECTED"].includes(state);
    await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { status: connected ? "CONNECTED" : disconnected ? "DISCONNECTED" : connection.status, connectedPhone: String(nestedValue(record, "wuid") ?? nestedValue(record, "phone") ?? connection.connectedPhone), qrCodeDataUrl: connected ? "" : connection.qrCodeDataUrl, lastConnectedAt: connected ? new Date() : connection.lastConnectedAt } });
  }

  if (event.includes("MESSAGE")) {
    const data = toRecord(record.data ?? record);
    const key = toRecord(data.key ?? record.key);
    const remoteJid = String(key.remoteJid ?? data.remoteJid ?? "");
    const fromMe = Boolean(key.fromMe ?? data.fromMe);
    const providerId = String(key.id ?? data.id ?? "");
    const message = toRecord(data.message ?? record.message);
    if (remoteJid && providerId && !remoteJid.endsWith("@broadcast")) {
      const media = mediaDetails(message);
      const isGroup = remoteJid.endsWith("@g.us");
      const senderName = String(data.pushName ?? data.notifyName ?? key.participant ?? data.participant ?? "").trim();
      const groupMetadata = toRecord(data.groupMetadata);
      const groupName = String(data.groupName ?? data.subject ?? data.groupSubject ?? groupMetadata.subject ?? "").trim();
      const rawBody = messageBody(message, media);
      const body = isGroup && !fromMe && senderName ? `${senderName}: ${rawBody}` : rawBody;
      const sentAt = sentAtFrom(data);
      const phone = remoteJid.replace(/@.*$/, "");
      const contactName = isGroup ? groupName : senderName;
      const photoFromEvent = String(data.profilePictureUrl ?? data.profilePicUrl ?? "");
      const existing = await prisma.whatsAppConversation.findUnique({ where: { arenaId_remoteJid: { arenaId: connection.arenaId, remoteJid } } });
      const conversation = await prisma.whatsAppConversation.upsert({ where: { arenaId_remoteJid: { arenaId: connection.arenaId, remoteJid } }, create: { arenaId: connection.arenaId, remoteJid, contactPhone: phone, contactName: contactName || (isGroup ? "Grupo do WhatsApp" : phone), profilePhotoUrl: photoFromEvent, unreadCount: fromMe ? 0 : 1, lastMessageAt: sentAt }, update: { ...(!fromMe && contactName ? { contactName } : {}), ...(!isGroup && photoFromEvent ? { profilePhotoUrl: photoFromEvent } : {}), ...(fromMe ? {} : { unreadCount: { increment: 1 } }), lastMessageAt: sentAt } });
      if (!conversation.profilePhotoUrl && !existing?.profilePhotoUrl && !remoteJid.endsWith("@g.us")) {
        const profilePhotoUrl = await getEvolutionProfilePicture(remoteJid, connection.arenaId).catch(() => "");
        if (profilePhotoUrl) await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { profilePhotoUrl } });
      }
      await prisma.whatsAppMessage.upsert({ where: { providerId }, create: { providerId, conversationId: conversation.id, direction: fromMe ? "OUTBOUND" : "INBOUND", body, mediaType: media.type, mediaMimeType: media.mimeType, mediaUrl: media.url, providerPayload: message as Prisma.InputJsonValue, sentAt }, update: {} });
    }
  }
  return NextResponse.json({ received: true, arenaId: connection.arenaId });
}
