import { NextRequest, NextResponse } from 'next/server';
import { arenaSlugSchema, portalNotificationsSchema } from '@/lib/backend/contracts/notifications';
import { getPublicPlayerAuth } from '@/lib/backend/services/player-session';
import { getAthletePortalNotifications } from '@/lib/backend/services/portal-notifications';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const arena = arenaSlugSchema.safeParse(request.nextUrl.searchParams.get('arena'));
  if (!arena.success || [...request.nextUrl.searchParams.keys()].some(key => key !== 'arena')) return NextResponse.json({ error: 'Invalid arena' }, { status: 400, headers });
  const auth = await getPublicPlayerAuth(arena.data);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  return NextResponse.json(portalNotificationsSchema.parse(await getAthletePortalNotifications(arena.data, auth.playerId)), { headers });
}
