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
