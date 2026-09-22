import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashWebhookSecret } from "@/lib/payments/connection-secrets";
import { prisma } from "@/lib/prisma";
import { getEvolutionProfilePicture } from "@/lib/integrations/evolution/client";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function nestedValue(payload: Record<string, unknown>, key: string) { const data = payload.data; return payload[key] ?? (data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined); }
function toRecord(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function messageBody(message: Record<string, unknown>) { const text = String(message.conversation ?? toRecord(message.extendedTextMessage).text ?? toRecord(message.imageMessage).caption ?? toRecord(message.videoMessage).caption ?? "").trim(); return text || "Mensagem recebida"; }

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const record = payload as Record<string, unknown>;
  const instanceName = String(request.nextUrl.searchParams.get("instance") ?? nestedValue(record, "instance") ?? nestedValue(record, "instanceName") ?? "");
  const secret = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-evolution-webhook-secret") ?? "";
  if (!instanceName || !secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connection = await prisma.whatsAppConnection.findUnique({ where: { instanceName } });
  if (!connection || !safeEqual(hashWebhookSecret(secret), connection.webhookSecretHash)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const event = String(record.event ?? record.type ?? "").toUpperCase(); const state = String(nestedValue(record, "state") ?? nestedValue(record, "status") ?? "").toUpperCase();
  if (event.includes("CONNECTION") || state) { const connected = ["OPEN", "CONNECTED"].includes(state); const disconnected = ["CLOSE", "CLOSED", "DISCONNECTED"].includes(state); await prisma.whatsAppConnection.update({ where: { id: connection.id }, data: { status: connected ? "CONNECTED" : disconnected ? "DISCONNECTED" : connection.status, connectedPhone: String(nestedValue(record, "wuid") ?? nestedValue(record, "phone") ?? connection.connectedPhone), qrCodeDataUrl: connected ? "" : connection.qrCodeDataUrl, lastConnectedAt: connected ? new Date() : connection.lastConnectedAt } }); }
  if (event.includes("MESSAGE")) {
    const data = toRecord(record.data ?? record);
    const key = toRecord(data.key ?? record.key);
    const remoteJid = String(key.remoteJid ?? data.remoteJid ?? "");
    const fromMe = Boolean(key.fromMe ?? data.fromMe);
    const providerId = String(key.id ?? data.id ?? "");
    const message = toRecord(data.message ?? record.message);
    if (remoteJid && providerId && !fromMe && !remoteJid.endsWith("@g.us") && !remoteJid.endsWith("@broadcast")) {
      const phone = remoteJid.replace(/@.*$/, ""); const body = messageBody(message);
      const photoFromEvent = String(data.profilePictureUrl ?? data.profilePicUrl ?? "");
      const conversation = await prisma.whatsAppConversation.upsert({ where: { arenaId_remoteJid: { arenaId: connection.arenaId, remoteJid } }, create: { arenaId: connection.arenaId, remoteJid, contactPhone: phone, contactName: String(data.pushName ?? data.notifyName ?? phone), profilePhotoUrl: photoFromEvent, unreadCount: 1, lastMessageAt: new Date() }, update: { contactName: String(data.pushName ?? data.notifyName ?? phone), ...(photoFromEvent ? { profilePhotoUrl: photoFromEvent } : {}), unreadCount: { increment: 1 }, lastMessageAt: new Date() } });
      if (!conversation.profilePhotoUrl) {
        const profilePhotoUrl = await getEvolutionProfilePicture(remoteJid, connection.arenaId).catch(() => "");
        if (profilePhotoUrl) await prisma.whatsAppConversation.update({ where: { id: conversation.id }, data: { profilePhotoUrl } });
      }
      await prisma.whatsAppMessage.upsert({ where: { providerId }, create: { providerId, conversationId: conversation.id, direction: "INBOUND", body, sentAt: new Date() }, update: {} });
    }
  }
  return NextResponse.json({ received: true, arenaId: connection.arenaId });
}
