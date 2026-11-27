import { NextRequest, NextResponse } from 'next/server';
import { portalNotificationReadSchema, notificationOutcomeSchema } from '@/lib/backend/contracts/notifications';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import * as service from "@/lib/backend/services/public-player-notification-read";
import { getPublicPlayerAuth } from "@/lib/backend/services/player-session";
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers });
  let parsed;
  try { parsed = portalNotificationReadSchema.safeParse(await readBoundedJson(request, 32768)); }
  catch (error) { return NextResponse.json({ error: 'Invalid payload' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers });
  if (!await getPublicPlayerAuth(parsed.data.arenaSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  const result = await service.markAllPublicPlayerNotificationsReadAction(parsed.data.arenaSlug, parsed.data.entries);
  return NextResponse.json(notificationOutcomeSchema.parse(result), { headers });
}
