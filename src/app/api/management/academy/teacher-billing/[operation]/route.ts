import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canEditModule } from '@/lib/permissions';
import { teacherBillingFields, teacherBillingInputSchema, type TeacherBillingOperation } from '@/lib/backend/contracts/teacher-plan-billing';
import { executeTeacherBilling } from '@/lib/backend/services/teacher-billing-mutations';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const raw = (await context.params).operation;
  if (!Object.hasOwn(teacherBillingFields, raw)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const operation = raw as TeacherBillingOperation; const auth = await requireArenaAccess();
  if (!canEditModule('teachers', auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: 'Você não tem permissão para alterar planos do professor.' }, { status: 403, headers });
  let input;
  try { input = teacherBillingInputSchema(operation).parse(await readBoundedJson(request, 64 * 1024)); }
  catch (error) { return NextResponse.json({ error: 'Dados inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData(); for (const [key, value] of Object.entries(input.fields)) form.set(key, value);
  try { return NextResponse.json(await executeTeacherBilling(operation, form), { headers }); }
  catch { return NextResponse.json({ error: 'Não foi possível confirmar a operação. Confira o plano e as cobranças antes de tentar novamente.' }, { status: 500, headers }); }
}
