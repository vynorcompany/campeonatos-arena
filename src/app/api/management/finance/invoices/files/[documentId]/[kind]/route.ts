import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireModuleView } from '@/lib/auth/guards';
import { canPerformPermission } from '@/lib/permissions';
import { fiscalFileKindSchema } from '@/lib/backend/contracts/fiscal-invoices';
import { resolveFiscalFile } from '@/lib/backend/services/fiscal-invoices';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ documentId: string; kind: string }> }) {
  const auth = await requireModuleView('finance');
  if (!canPerformPermission('finance:settings:manage', auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }; const params = await context.params; const kind = fiscalFileKindSchema.safeParse(params.kind);
  if (!kind.success || !params.documentId || params.documentId.length > 200 || request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400, headers });
  return NextResponse.json(await resolveFiscalFile(auth.arenaId, params.documentId, kind.data), { headers });
}
