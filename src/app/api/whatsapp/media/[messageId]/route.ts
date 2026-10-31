import { NextRequest, NextResponse } from "next/server";
import { requireModuleView } from "@/lib/auth/guards";
import { getEvolutionMediaDataUrl } from "@/lib/integrations/evolution/client";
import { arenaDatabase } from "@/lib/arena-database";
import { getActiveWhatsAppAccountJid } from "@/lib/whatsapp-active-account";
import { safeWhatsAppMediaType } from "@/lib/whatsapp-media-types";

function dataUrlResponse(dataUrl: string, mimeType: string, fileName = "anexo") {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const encoded = dataUrl.slice(comma + 1);
  const bytes = Buffer.from(encoded, "base64");
  const media = safeWhatsAppMediaType(mimeType || dataUrl.match(/^data:([^;,]+)/)?.[1] || "");
  return new NextResponse(bytes, {
    headers: {
      "content-type": media.mimeType,
      "content-disposition": `${media.disposition}; filename="anexo"; filename*=UTF-8''${encodeURIComponent(fileName).replace(/'/g, "%27")}`,
      "x-content-type-options": "nosniff",
      ...(media.disposition === "attachment" ? { "content-security-policy": "sandbox" } : {}),
      "cache-control": "private, max-age=300"
    }
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const auth = await requireModuleView("support");
  const accountJid = await getActiveWhatsAppAccountJid(auth.arenaId);
  if (!accountJid) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  const { messageId } = await params;
  const message = await arenaDatabase(auth.arenaId).whatsAppMessage.findFirst({
    where: { id: messageId, conversation: { arenaId: auth.arenaId, accountJid } },
    select: { providerId: true, providerPayload: true, mediaMimeType: true, mediaFileName: true, mediaUrl: true }
  });
  if (!message) return NextResponse.json({ error: "Mídia não encontrada." }, { status: 404 });
  const dataUrl = message.mediaUrl.startsWith("data:") ? message.mediaUrl : message.providerPayload ? await getEvolutionMediaDataUrl({ providerId: message.providerId, providerPayload: message.providerPayload, mimeType: message.mediaMimeType, mediaUrl: message.mediaUrl }, auth.arenaId) : "";
  if (!dataUrl) return NextResponse.json({ error: "Não foi possível carregar esta mídia." }, { status: 404 });
  if (/^https?:\/\//i.test(dataUrl)) return NextResponse.redirect(dataUrl);
  return dataUrlResponse(dataUrl, message.mediaMimeType, message.mediaFileName || "anexo") ?? NextResponse.json({ error: "Mídia inválida." }, { status: 422 });
}
