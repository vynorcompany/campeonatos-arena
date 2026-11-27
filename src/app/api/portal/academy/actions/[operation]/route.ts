import { getPublicPlayerAuth } from '@/lib/backend/services/player-session';
import { NextRequest, NextResponse } from 'next/server';
import { portalAcademyOperations, academyMutationFields, academyMutationInputSchema, type AcademyMutationOperation } from '@/lib/backend/contracts/academy-mutations';
import { executeAcademyMutation } from '@/lib/backend/services/academy-mutations';
import { AcademyOperationError } from '@/lib/backend/academy-operation-error';
import { FinanceOperationError } from '@/lib/finance/action-error';
import { StaleRecordError } from '@/lib/record-version';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Origem não autorizada.' }, { status: 403, headers });
  const { operation: raw } = await context.params;
  if (!Object.hasOwn(academyMutationFields, raw)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  const operation = raw as AcademyMutationOperation;
  if (!portalAcademyOperations.includes(operation)) return NextResponse.json({ error: 'Operação inválida.' }, { status: 404, headers });
  // The service derives player and teacher identity exclusively from the athlete session.
  let input;
  try { input = academyMutationInputSchema(operation).parse(await readBoundedJson(request, 768 * 1024)); }
  catch (error) { return NextResponse.json({ error: 'Dados inválidos.' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData(); for (const [key, values] of Object.entries(input.fields)) for (const value of values) form.append(key, value);
  if (!await getPublicPlayerAuth(String(form.get('arenaSlug') ?? ''))) return NextResponse.json({ error: 'Entre na sua conta de cliente para continuar.' }, { status: 401, headers });
  try { return NextResponse.json(await executeAcademyMutation(operation, form), { headers }); }
  catch (error) {
    const publicError = error instanceof AcademyOperationError || error instanceof FinanceOperationError || error instanceof StaleRecordError;
    return NextResponse.json({ error: publicError ? error.message : 'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.' }, { status: error instanceof FinanceOperationError ? error.status : error instanceof StaleRecordError ? 409 : publicError ? 400 : 500, headers });
  }
}
