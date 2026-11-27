import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canViewModule } from '@/lib/permissions';
import { clientDirectoryQuerySchema } from '@/lib/backend/contracts/client-directory';
import { resolveClientDirectory } from '@/lib/backend/services/client-directory';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireArenaAccess();
  if (!canViewModule('players', auth.arenaRole, auth.systemRole, auth.viewPermissions)) notFound();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const query = clientDirectoryQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: 'Invalid filters' }, { status: 400, headers });
  return NextResponse.json(await resolveClientDirectory(auth.arenaId, query.data), { headers });
}
