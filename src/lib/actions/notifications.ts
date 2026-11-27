"use server";
import { revalidatePath } from "next/cache";
import { remoteManagementNotificationRead } from "@/lib/backend/notifications-client";
async function execute(id?: string) {
  if (process.env.VX4_BACKEND_ORIGIN) await remoteManagementNotificationRead(process.env.VX4_BACKEND_ORIGIN, id);
  else {
    const local = await import('@/lib/backend/services/notifications');
    if (id === undefined) await local.markAllArenaNotificationsReadAction();
    else await local.markArenaNotificationReadAction(id);
  }
  revalidatePath('/agenda');
}
export async function markArenaNotificationReadAction(notificationId: string) { return execute(notificationId); }
export async function markAllArenaNotificationsReadAction() { return execute(); }
