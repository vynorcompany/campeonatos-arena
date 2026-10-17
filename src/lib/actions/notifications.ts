"use server";

import { revalidatePath } from "next/cache";
import { requireArenaAccess } from "@/lib/auth/session";
import { arenaDatabase } from "@/lib/arena-database";

export async function markArenaNotificationReadAction(notificationId: string) {
  const auth = await requireArenaAccess();
  await arenaDatabase(auth.arenaId).arenaNotification.updateMany({ where: { id: notificationId, arenaId: auth.arenaId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/agenda");
}

export async function markAllArenaNotificationsReadAction() {
  const auth = await requireArenaAccess();
  await arenaDatabase(auth.arenaId).arenaNotification.updateMany({ where: { arenaId: auth.arenaId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/agenda");
}
