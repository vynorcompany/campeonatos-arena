import 'server-only';
import { cookies } from 'next/headers';
import { readBackendContract } from '@/lib/backend/http-client';
import { managementCookieHeader } from '@/lib/backend/management-context-client';
import { lessonCreditBalanceSchema, lessonCreditRequestsSchema } from '@/lib/backend/contracts/lesson-credit-reads';
export async function getLessonCreditBalance(arenaId: string, playerId: string, arenaSlug: string) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return (await import('@/lib/backend/services/lesson-credit-reads')).resolveLessonCreditBalance(arenaId, playerId, arenaSlug);
  return readBackendContract(origin, `/api/portal/academy/credits/balance?arenaSlug=${encodeURIComponent(arenaSlug)}`, lessonCreditBalanceSchema, { cookie: await athleteCookie() });
}
async function athleteCookie() {
  const token = (await cookies()).get('arena_player_session')?.value;
  return token ? `arena_player_session=${encodeURIComponent(token)}` : '';
}
export async function getLessonCreditRequests(arenaId: string, portal?: { arenaSlug: string; playerId: string }) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return (await import('@/lib/backend/services/lesson-credit-reads')).resolveLessonCreditRequests(arenaId, portal?.playerId);
  return readBackendContract(origin, portal ? `/api/portal/academy/credits/requests?arenaSlug=${encodeURIComponent(portal.arenaSlug)}` : '/api/management/academy/credit-requests', lessonCreditRequestsSchema, { cookie: portal ? await athleteCookie() : (await managementCookieHeader()) ?? '' });
}
