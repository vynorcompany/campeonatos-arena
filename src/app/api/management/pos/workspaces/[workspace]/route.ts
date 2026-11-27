import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { resolveCashWorkspace, resolveSalesWorkspace } from '@/lib/backend/services/pos-workspaces';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ workspace: string }> }) {
  const auth = await requireModuleView('pos'); const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }; const workspace = (await context.params).workspace;
  if (workspace !== 'cash' && workspace !== 'sales') return NextResponse.json({ error: 'Consulta inválida.' }, { status: 404, headers });
  if (request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await (workspace === 'cash' ? resolveCashWorkspace(auth.arenaId) : resolveSalesWorkspace(auth.arenaId)), { headers });
}
