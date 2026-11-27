import { NextRequest, NextResponse } from 'next/server';
import { managementNotificationReadSchema, notificationOutcomeSchema } from '@/lib/backend/contracts/notifications';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import * as service from "@/lib/backend/services/notifications";
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers });
  let parsed;
  try { parsed = managementNotificationReadSchema.safeParse(await readBoundedJson(request, 32768)); }
  catch (error) { return NextResponse.json({ error: 'Invalid payload' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers });
  if (parsed.data.operation === 'all') await service.markAllArenaNotificationsReadAction();
  else await service.markArenaNotificationReadAction(parsed.data.id);
  const result = { error: null };
  return NextResponse.json(notificationOutcomeSchema.parse(result), { headers });
}
