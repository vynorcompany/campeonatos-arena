import { NextRequest, NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { canPerformPermission } from '@/lib/permissions';
import { teacherDetailQuerySchema } from '@/lib/backend/contracts/teacher-detail';
import { resolveTeacherDetail } from '@/lib/backend/services/teacher-detail';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{ teacherId: string }> }) {
  const auth = await requireModuleView('teachers');
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const teacherId = (await context.params).teacherId;
  const params = request.nextUrl.searchParams;
  const query = teacherDetailQuerySchema.safeParse(Object.fromEntries(params));
  if (!teacherId || teacherId.length > 200 || !query.success || [...params.keys()].some(key => params.getAll(key).length !== 1)) return NextResponse.json({ error: 'Filtros inválidos.' }, { status: 400, headers });
  const canRegisterPayment = canPerformPermission('finance:receivable:settle', auth.arenaRole, auth.systemRole, auth.editPermissions);
  return NextResponse.json(await resolveTeacherDetail(auth.arenaId, teacherId, query.data, canRegisterPayment), { headers });
}
