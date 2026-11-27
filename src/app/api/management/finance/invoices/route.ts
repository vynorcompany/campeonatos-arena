import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireModuleView } from '@/lib/auth/guards';
import { canPerformPermission } from '@/lib/permissions';
import { fiscalInvoicesQuerySchema } from '@/lib/backend/contracts/fiscal-invoices';
import { resolveFiscalInvoices } from '@/lib/backend/services/fiscal-invoices';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireModuleView('finance');
  if (!canPerformPermission('finance:settings:manage', auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const query = fiscalInvoicesQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success || request.nextUrl.searchParams.getAll('documentId').length > 1) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveFiscalInvoices(auth.arenaId, query.data.documentId), { headers });
}
