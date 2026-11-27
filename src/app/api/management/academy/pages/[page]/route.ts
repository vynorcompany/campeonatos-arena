import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireModuleView } from '@/lib/auth/guards';
import { canEditModule } from '@/lib/permissions';
import { academyPageSchema } from '@/lib/backend/contracts/academy-pages';
import { resolveAcademyPage } from '@/lib/backend/services/academy-pages';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ page: string }> }) {
  const parsed = academyPageSchema.safeParse((await context.params).page); if (!parsed.success) notFound();
  const page = parsed.data;
  const auth = await requireModuleView(page === 'register' ? 'lessons' : page === 'policy' ? 'teachers' : page);
  if (page === 'policy' && !canEditModule('teachers', auth.arenaRole, auth.systemRole, auth.editPermissions)) notFound();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (request.nextUrl.searchParams.size) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  return NextResponse.json(await resolveAcademyPage(auth.arenaId, page), { headers });
}
