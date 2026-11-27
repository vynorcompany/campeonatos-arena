import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { resolveLessonCreditRequests } from '@/lib/backend/services/lesson-credit-reads';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireModuleView('students');
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveLessonCreditRequests(auth.arenaId), { headers });
}
