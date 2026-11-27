import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { clientLoyaltyQuerySchema, clientLoyaltySchema } from '@/lib/backend/contracts/client-loyalty';
import { getClientLoyaltyAction } from '@/lib/backend/services/client-loyalty';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  await requireModuleView('players');
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const query = clientLoyaltyQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400, headers });
  try { return NextResponse.json(clientLoyaltySchema.parse(await getClientLoyaltyAction(query.data.playerId)), { headers }); }
  catch (error) { return NextResponse.json({ error: 'Não foi possível carregar a fidelidade.' }, { status: error instanceof Error && error.message === 'Cliente não encontrado nesta arena.' ? 404 : 500, headers }); }
}
