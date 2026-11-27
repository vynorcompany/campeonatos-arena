import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { canEditModule } from '@/lib/permissions';
import { stockWorkspaceSchema, stockWorkspaceQuerySchema } from '@/lib/backend/contracts/stock-workspaces';
import { resolveStockWorkspace } from '@/lib/backend/services/stock-workspaces';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ workspace: string }> }) {
  const auth = await requireModuleView('stock'); const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const workspace = stockWorkspaceSchema.safeParse((await context.params).workspace);
  const query = stockWorkspaceQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!workspace.success) return NextResponse.json({ error: 'Consulta inválida.' }, { status: 404, headers });
  if (!query.success || [...request.nextUrl.searchParams.keys()].some(key => request.nextUrl.searchParams.getAll(key).length !== 1)) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  const canEdit = canEditModule('stock', auth.arenaRole, auth.systemRole, auth.editPermissions);
  if (workspace.data === 'new-product' && !canEdit) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403, headers });
  return NextResponse.json(await resolveStockWorkspace(auth.arenaId, workspace.data, query.data, canEdit), { headers });
}
