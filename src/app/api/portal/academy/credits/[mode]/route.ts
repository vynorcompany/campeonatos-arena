import { NextRequest, NextResponse } from 'next/server';
import { getPublicPlayerAuth } from '@/lib/backend/services/player-session';
import { creditReadModeSchema } from '@/lib/backend/contracts/lesson-credit-reads';
import { resolveLessonCreditBalance, resolveLessonCreditRequests } from '@/lib/backend/services/lesson-credit-reads';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ mode: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const mode = creditReadModeSchema.safeParse((await context.params).mode);
  if (!mode.success) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 404, headers });
  const query = request.nextUrl.searchParams;
  const slug = query.get('arenaSlug');
  if (!slug || slug.length > 200 || query.getAll('arenaSlug').length !== 1 || [...query.keys()].some(key => key !== 'arenaSlug')) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  const auth = await getPublicPlayerAuth(slug);
  if (!auth) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401, headers });
  const data = mode.data === 'balance' ? await resolveLessonCreditBalance(auth.arenaId, auth.playerId, slug) : await resolveLessonCreditRequests(auth.arenaId, auth.playerId);
  return NextResponse.json(data, { headers });
}
