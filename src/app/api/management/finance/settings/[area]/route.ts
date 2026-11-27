import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { canPerformPermission } from '@/lib/permissions';
import { requireModuleView } from '@/lib/auth/guards';
import { financialSettingsAreaSchema } from '@/lib/backend/contracts/financial-settings';
import { resolveFinancialSettingsPage } from '@/lib/backend/services/financial-settings';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ area: string }> }) {
  const auth = await requireModuleView('finance');
  if (!canPerformPermission('finance:settings:manage', auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const parsed = financialSettingsAreaSchema.safeParse((await context.params).area);
  if (!parsed.success) notFound();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveFinancialSettingsPage(auth.arenaId, parsed.data), { headers });
}
