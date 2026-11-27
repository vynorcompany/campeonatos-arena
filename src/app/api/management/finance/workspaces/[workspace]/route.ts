import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireFinanceView } from '@/lib/auth/guards';
import { financeWorkspaceSchema, financeWorkspaceQuerySchema } from '@/lib/backend/contracts/finance-workspaces';
import { resolveFinanceWorkspace } from '@/lib/backend/services/finance-workspaces';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ workspace: string }> }) {
  const workspace = financeWorkspaceSchema.safeParse((await context.params).workspace);
  if (!workspace.success) notFound();
  const auth = await requireFinanceView(workspace.data === 'payroll' ? 'payable' : 'receivable');
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const query = financeWorkspaceQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveFinanceWorkspace(auth.arenaId, workspace.data, query.data.mes), { headers });
}
