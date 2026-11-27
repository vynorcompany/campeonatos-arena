import "server-only";

import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { arenaDatabase } from "@/lib/arena-database";

export async function markArenaNotificationReadAction(notificationId: string) {
  const auth = await requireArenaAccess();
  await arenaDatabase(auth.arenaId).arenaNotification.updateMany({ where: { id: notificationId, arenaId: auth.arenaId, readAt: null, type: { not: "SYSTEM_RECOVERY" } }, data: { readAt: new Date() } });

}

export async function markAllArenaNotificationsReadAction() {
  const auth = await requireArenaAccess();
  await arenaDatabase(auth.arenaId).arenaNotification.updateMany({ where: { arenaId: auth.arenaId, readAt: null, type: { not: "SYSTEM_RECOVERY" } }, data: { readAt: new Date() } });

}
