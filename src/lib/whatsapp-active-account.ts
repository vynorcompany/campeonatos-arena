import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";

export async function getActiveWhatsAppAccountJid(arenaId: string) {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { arenaId },
    select: { status: true, connectedPhone: true },
  });
  return connection?.status === "CONNECTED" ? normalizeWhatsAppAccountJid(connection.connectedPhone) : "";
}

export async function getActiveWhatsAppUnreadCount(arenaId: string) {
  const accountJid = await getActiveWhatsAppAccountJid(arenaId);
  if (!accountJid) return 0;
  const result = await prisma.whatsAppConversation.aggregate({
    where: { arenaId, accountJid },
    _sum: { unreadCount: true },
  });
  return result._sum.unreadCount ?? 0;
}
