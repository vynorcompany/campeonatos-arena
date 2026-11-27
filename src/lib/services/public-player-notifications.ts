import "server-only";
import { cookies } from 'next/headers';
import { readBackendContract } from '@/lib/backend/http-client';
import { portalNotificationsSchema, arenaSlugSchema } from '@/lib/backend/contracts/notifications';
export type { AthletePortalNotification } from '@/lib/backend/contracts/notifications';
export async function getAthletePortalNotifications(arenaSlug: string, playerId: string) {
  if (process.env.VX4_BACKEND_ORIGIN) {
    arenaSlugSchema.parse(arenaSlug);
    const token = (await cookies()).get('arena_player_session')?.value;
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN, `/api/portal/notifications?arena=${encodeURIComponent(arenaSlug)}`, portalNotificationsSchema, token ? { cookie: `arena_player_session=${encodeURIComponent(token)}` } : undefined, { timeoutMs: 60_000 });
  }
  const local = await import('@/lib/backend/services/portal-notifications');
  return local.getAthletePortalNotifications(arenaSlug, playerId);
}
