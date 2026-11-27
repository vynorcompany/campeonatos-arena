import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { resolveProductDetail } from '@/lib/backend/services/product-detail';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const auth = await requireModuleView('stock'); const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }; const productId = (await context.params).productId;
  if (!productId || productId.length > 100 || request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400, headers });
  return NextResponse.json(await resolveProductDetail(auth.arenaId, productId), { headers });
}
