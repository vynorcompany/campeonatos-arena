import "server-only";

import type { Prisma } from "@prisma/client";
import { arenaDatabase } from "@/lib/arena-database";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";

// The shared sidebar must queue for a connection during bursts, like its notification read.
const sidebarReadOptions = { maxWait: 20_000, timeout: 10_000 };
async function readAccountJid(tx: Pick<Prisma.TransactionClient, "whatsAppConnection">, arenaId: string) {
  const connection = await tx.whatsAppConnection.findUnique({
    where: { arenaId },
    select: { status: true, connectedPhone: true },
  });
  return connection?.status === "CONNECTED" ? normalizeWhatsAppAccountJid(connection.connectedPhone) : "";
}

export async function getActiveWhatsAppAccountJid(arenaId: string) {
  return arenaDatabase(arenaId).$transaction(tx => readAccountJid(tx, arenaId), sidebarReadOptions);
}

export async function getActiveWhatsAppUnreadCount(arenaId: string) {
  return arenaDatabase(arenaId).$transaction(async tx => {
    const accountJid = await readAccountJid(tx, arenaId);
    if (!accountJid) return 0;
    const result = await tx.whatsAppConversation.aggregate({
      where: { arenaId, accountJid },
      _sum: { unreadCount: true },
    });
    return result._sum.unreadCount ?? 0;
  }, sidebarReadOptions);
}
