import "server-only";
import { cookies, headers } from 'next/headers';
import { backendOrigin } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { managementNotificationReadSchema, portalNotificationReadSchema, notificationOutcomeSchema } from '@/lib/backend/contracts/notifications';
async function send(origin: string, path: '/api/management/notifications/read' | '/api/portal/notifications/read', payload: unknown, cookie?: string) {
  const browserOrigin = (await headers()).get('origin');
  const response = await fetch(new URL(path, backendOrigin(origin)), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(browserOrigin ? { origin: browserOrigin } : {}), ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('Não foi possível salvar a leitura.');
  return notificationOutcomeSchema.parse(await response.json());
}
export async function remoteManagementNotificationRead(origin: string, id?: string) {
  const payload = managementNotificationReadSchema.parse(id === undefined ? { operation: 'all' } : { operation: 'one', id });
  return send(origin, '/api/management/notifications/read', payload, await managementCookieHeader());
}
export async function remotePortalNotificationRead(origin: string, arenaSlug: string, entries: unknown) {
  const payload = portalNotificationReadSchema.parse({ arenaSlug, entries });
  const token = (await cookies()).get('arena_player_session')?.value;
  return send(origin, '/api/portal/notifications/read', payload, token ? `arena_player_session=${encodeURIComponent(token)}` : undefined);
}
