import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireModuleView } from '@/lib/auth/guards';
import { canPerformPermission } from '@/lib/permissions';
import { fiscalFileKindSchema } from '@/lib/backend/contracts/fiscal-invoices';
import { getFiscalFileTarget } from '@/lib/fiscal/invoice-data';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ documentId: string; kind: string }> }) {
  const auth = await requireModuleView('finance');
  if (!canPerformPermission('finance:settings:manage', auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'Referrer-Policy': 'no-referrer' }; const params = await context.params; const kind = fiscalFileKindSchema.safeParse(params.kind);
  if (!kind.success || !params.documentId || params.documentId.length > 200 || request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 404, headers });
  try { const target = await getFiscalFileTarget(auth.arenaId, params.documentId, kind.data); if (!target) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404, headers }); return new NextResponse(null, { status: 303, headers: { ...headers, Location: target.url } }); } catch { return NextResponse.json({ error: 'Não foi possível abrir o arquivo fiscal.' }, { status: 503, headers }); }
}
