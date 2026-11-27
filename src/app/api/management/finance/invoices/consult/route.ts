import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { fiscalConsultInputSchema, fiscalConsultOutcomeSchema } from '@/lib/backend/contracts/fiscal-invoices';
import { consultFocusDocumentAction } from '@/lib/backend/services/focus-fiscal-actions';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const auth = await requireArenaAccess();
  if (!canPerformPermission('finance:settings:manage', auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: 'Sem permissão para gerenciar notas fiscais.' }, { status: 403, headers });
  let input; try { input = fiscalConsultInputSchema.parse(await readBoundedJson(request, 16 * 1024)); } catch (error) { return NextResponse.json({ error: 'Dados inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData(); for (const [key,value] of Object.entries(input.fields)) form.set(key,value);
  try { return NextResponse.json(fiscalConsultOutcomeSchema.parse(await consultFocusDocumentAction(form) ?? {}), { headers }); } catch { return NextResponse.json({ error: 'Não foi possível confirmar a operação fiscal. Confira a nota antes de tentar novamente.' }, { status: 500, headers }); }
}
