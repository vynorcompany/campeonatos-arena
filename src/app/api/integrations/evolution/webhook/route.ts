import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashWebhookSecret } from "@/lib/payments/connection-secrets";
import { prisma } from "@/lib/prisma";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function nestedValue(payload: Record<string, unknown>, key: string) { const data = payload.data; return payload[key] ?? (data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined); }

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
  return NextResponse.json({ received: true, arenaId: connection.arenaId });
}
