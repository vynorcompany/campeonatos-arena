import { NextRequest, NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { getEvolutionMediaDataUrl } from "@/lib/integrations/evolution/client";
import { prisma } from "@/lib/prisma";

function dataUrlResponse(dataUrl: string, mimeType: string) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const encoded = dataUrl.slice(comma + 1);
  const bytes = Buffer.from(encoded, "base64");
  return new NextResponse(bytes, {
    headers: {
      "content-type": mimeType || dataUrl.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream",
      "cache-control": "private, max-age=300"
    }
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const auth = await requireModuleView("support");
  const { messageId } = await params;
  const message = await prisma.whatsAppMessage.findFirst({
    where: { id: messageId, conversation: { arenaId: auth.arenaId } },
    select: { providerId: true, providerPayload: true, mediaMimeType: true, mediaUrl: true }
  });
  if (!message) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  const dataUrl = message.mediaUrl.startsWith("data:") ? message.mediaUrl : message.providerPayload ? await getEvolutionMediaDataUrl({ providerId: message.providerId, providerPayload: message.providerPayload, mimeType: message.mediaMimeType, mediaUrl: message.mediaUrl }, auth.arenaId) : "";
  if (!dataUrl) return NextResponse.json({ error: "Não foi possível carregar esta mídia." }, { status: 404 });
  if (/^https?:\/\//i.test(dataUrl)) return NextResponse.redirect(dataUrl);
  return dataUrlResponse(dataUrl, message.mediaMimeType) ?? NextResponse.json({ error: "Mídia inválida." }, { status: 422 });
}
