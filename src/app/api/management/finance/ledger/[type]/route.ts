import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireFinanceView } from '@/lib/auth/guards';
import { financeLedgerQuerySchema } from '@/lib/backend/contracts/finance-ledger';
import { resolveFinanceLedgerPage } from '@/lib/backend/services/finance-ledger';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const { type } = await context.params;
  if (type !== 'receivable' && type !== 'payable') notFound();
  const auth = await requireFinanceView(type);
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const query = financeLedgerQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveFinanceLedgerPage(auth.arenaId, type === 'receivable' ? 'REVENUE' : 'EXPENSE', query.data), { headers });
}
