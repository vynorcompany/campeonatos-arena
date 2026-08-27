import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { resolveEvolutionConfig } from "@/lib/integrations/evolution";

function hasValidWebhookSecret(receivedSecret: string | null, expectedSecret: string) {
  if (!receivedSecret) return false;
  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(expectedSecret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: NextRequest) {
  const config = resolveEvolutionConfig({
    apiUrl: env.evolutionApiUrl,
    apiKey: env.evolutionApiKey,
    instanceName: env.evolutionInstanceName,
    webhookSecret: env.evolutionWebhookSecret
  });

  if (!config) return NextResponse.json({ error: "Evolution não configurada." }, { status: 503 });
  if (!hasValidWebhookSecret(request.headers.get("x-evolution-webhook-secret"), config.webhookSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  // O processamento de eventos será conectado gradualmente aos fluxos de reservas e cobranças.
  return NextResponse.json({ received: true });
}
