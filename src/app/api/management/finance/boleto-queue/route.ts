import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { notFound } from 'next/navigation';
import { boletoQueueQuerySchema } from '@/lib/backend/contracts/boleto-queue';
import { resolveBoletoQueue } from '@/lib/backend/services/boleto-queue';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
 const auth = await requireArenaAccess();
 // Preserve the existing queue page's permission check against editPermissions.
 if (!canPerformPermission('finance:receivable:view',auth.arenaRole,auth.systemRole,auth.editPermissions)) notFound();
 const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
 const params = request.nextUrl.searchParams; const query = boletoQueueQuerySchema.safeParse(Object.fromEntries(params));
 if (!query.success || ['q','status'].some(key => params.getAll(key).length > 1)) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
 return NextResponse.json(await resolveBoletoQueue(auth.arenaId,query.data.status,query.data.q), { headers });
}
