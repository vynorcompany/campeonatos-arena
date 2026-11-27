import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { productPageSchema } from '@/lib/backend/contracts/product-pages';
import { resolveProductPage } from '@/lib/backend/services/product-pages';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ page: string }> }) {
  const auth = await requireModuleView('stock');
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const page = productPageSchema.safeParse((await context.params).page);
  if (!page.success) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 404, headers });
  if (request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveProductPage(auth.arenaId, page.data), { headers });
}
