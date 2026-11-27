"use server";
import { revalidatePath } from "next/cache";
import { remotePortalNotificationRead } from "@/lib/backend/notifications-client";
export async function markAllPublicPlayerNotificationsReadAction(arenaSlug: string, entries: Array<{ id: string; source: 'PLAYER' | 'ARENA' | 'FINANCE' }>) {
  let result;
  if (process.env.VX4_BACKEND_ORIGIN) {
    try { result = await remotePortalNotificationRead(process.env.VX4_BACKEND_ORIGIN, arenaSlug, entries); }
    catch { return { error: 'Não foi possível salvar a leitura. Tente novamente.' }; }
  } else {
    const local = await import('@/lib/backend/services/public-player-notification-read');
    result = await local.markAllPublicPlayerNotificationsReadAction(arenaSlug, entries);
  }
  if (!result.error) { revalidatePath(`/classificacao/${arenaSlug}`); revalidatePath('/home'); }
  return result;
}
export async function markPublicPlayerNotificationReadAction(arenaSlug: string, id: string, source: 'PLAYER' | 'ARENA' | 'FINANCE') {
  return markAllPublicPlayerNotificationsReadAction(arenaSlug, [{ id, source }]);
}
